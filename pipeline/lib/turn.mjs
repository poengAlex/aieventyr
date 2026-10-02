// Turn animations: a model sheet shows a character from the front, three-quarter and side,
// side by side at the same scale. Cut out and lined up on the head and feet, the three
// views become a short loop of the character turning to the side and back, with the
// in-between frames made by ffmpeg's motion interpolation.
import { execFile } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import { promisify } from 'util'

const run = promisify(execFile)

// The video is square, like the portrait, so the dialog keeps its size when it switches.
const SIZE = 720
// 2 views a second, interpolated to 16 frames a second: each 45° step takes half a second.
const FPS = 16
const STEP = FPS / 2
// The loop pauses on the front and on the side (in frames).
const HOLD_FRONT = 22
const HOLD_SIDE = 18
// A step between two views that overlap less than this (see overlap()) keeps only the
// in-between frame next to each view: the figure snaps round in a fifth of a second, like
// stop-motion, instead of showing two heads or a grey ghost (black horses are the worst).
const HARD_STEP = 0.5
const SKIPPED = [2, 3, 4, 5, 6]
// Below this (see facesAway()), the side view is mirrored to face the same way as the
// three-quarter view.
const FACES_AWAY = 0.92
// How far a pixel must differ from the paper to count as part of the figure (sum of the
// RGB differences). The soft ground shadow stays below it.
const INK = 60
const FEATHER = 24

// Where the web copy of the turn for a model sheet goes: characters/<slug>-turn.mp4.
export const turnFile = (sheetBase) => `${sheetBase}-turn.mp4`

let ffmpegCheck
// Whether ffmpeg is installed with what the turns need, or why not.
export function ffmpegProblem() {
  ffmpegCheck ??= Promise.all([
    run('ffmpeg', ['-hide_banner', '-filters']),
    run('ffmpeg', ['-hide_banner', '-encoders']),
  ]).then(
    ([filters, encoders]) =>
      !filters.stdout.includes('minterpolate')
        ? 'ffmpeg has no minterpolate filter'
        : !encoders.stdout.includes('libx264')
          ? 'ffmpeg has no libx264 encoder'
          : null,
    () => 'ffmpeg is not installed (brew install ffmpeg)',
  )
  return ffmpegCheck
}

// The median colour of the sheet's outer rows and columns.
function paperColour(data, width, height) {
  const samples = [[], [], []]
  const add = (x, y) => {
    const i = (y * width + x) * 3
    for (let c = 0; c < 3; c++) samples[c].push(data[i + c])
  }
  for (let y = 0; y < 12; y++) for (let x = 0; x < width; x += 3) add(x, y)
  for (let y = 0; y < height; y += 3)
    for (let x = 0; x < 12; x++) {
      add(x, y)
      add(width - 1 - x, y)
    }
  return samples.map((values) => values.sort((a, b) => a - b)[values.length >> 1])
}

// Finds the three figures: the sheet is split at the emptiest column near each third,
// then each part is trimmed to its figure.
function findFigures(data, width, height, paper) {
  const ink = new Uint8Array(width * height)
  const columns = new Uint32Array(width)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      const difference =
        Math.abs(data[i] - paper[0]) +
        Math.abs(data[i + 1] - paper[1]) +
        Math.abs(data[i + 2] - paper[2])
      if (difference > INK) {
        ink[y * width + x] = 1
        columns[x]++
      }
    }
  const splitNear = (from, to) => {
    let best = Math.round(from * width)
    for (let x = best; x < Math.round(to * width); x++) if (columns[x] < columns[best]) best = x
    return best
  }
  const splits = [0, splitNear(0.22, 0.45), splitNear(0.55, 0.78), width]
  for (const split of splits.slice(1, 3))
    if (columns[split] > height * 0.02) throw new Error('the three views touch')

  return [0, 1, 2].map((index) => {
    const from = splits[index]
    const to = splits[index + 1]
    let x0 = to
    let x1 = from
    let y0 = height
    let y1 = 0
    for (let x = from; x < to; x++) {
      if (columns[x] <= 3) continue
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
    }
    for (let y = 0; y < height; y++) {
      let count = 0
      for (let x = from; x < to; x++) count += ink[y * width + x]
      if (count <= 2) continue
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
    }
    if (x1 - x0 < width * 0.05 || y1 - y0 < height * 0.3)
      throw new Error(`view ${index + 1} is missing or too small`)
    // The turning axis: the middle of the head and upper body. Feet, tails and braids
    // swing out further down.
    let sum = 0
    let count = 0
    const bandEnd = y0 + Math.round((y1 - y0) * 0.45)
    for (let y = y0; y <= bandEnd; y++)
      for (let x = x0; x <= x1; x++)
        if (ink[y * width + x]) {
          sum += x
          count++
        }
    return { from, to, x0, x1, y0, y1, axis: count ? sum / count : (x0 + x1) / 2 }
  })
}

// The three views on square paper frames of the same size, with each figure's turning
// axis in the middle and its feet on the same ground line. The strip around each figure
// fades into plain paper at its edges, so no seams show.
function frames(data, width, height, paper, figures) {
  const pad = Math.round(height * 0.03)
  const tallest = Math.max(...figures.map((f) => f.y1 - f.y0))
  const halfWidth = Math.max(...figures.flatMap((f) => [f.axis - f.x0, f.x1 - f.axis]))
  const side = Math.ceil(Math.max(tallest, 2 * halfWidth) + 2 * pad)
  const ground = Math.round((side + tallest) / 2)
  const ramp = (distance) => Math.min(1, Math.max(0, distance / FEATHER))
  return figures.map((f) => {
    const frame = Buffer.alloc(side * side * 3)
    for (let i = 0; i < frame.length; i += 3) frame.set(paper, i)
    const dx = Math.round(side / 2 - f.axis)
    const dy = ground - f.y1
    for (let y = Math.max(0, dy); y < Math.min(side, height + dy); y++) {
      const sy = y - dy
      const edgeY = Math.min(ramp(sy), ramp(height - 1 - sy))
      for (let x = Math.max(0, f.from + dx); x < Math.min(side, f.to + dx); x++) {
        const sx = x - dx
        const alpha =
          Math.min(
            edgeY,
            f.from === 0 ? 1 : ramp(sx - f.from),
            f.to === width ? 1 : ramp(f.to - 1 - sx),
          ) * Math.min(ramp(sx), ramp(width - 1 - sx))
        const target = (y * side + x) * 3
        const source = (sy * width + sx) * 3
        for (let c = 0; c < 3; c++)
          frame[target + c] = Math.round(data[source + c] * alpha + paper[c] * (1 - alpha))
      }
    }
    return { frame, side }
  })
}

// How much two lined-up views cover the same place (the intersection over the union of
// their ink). A person turning keeps most of their outline; an animal whose side view is
// long does not, and there the interpolation shows two heads at once.
function overlap(a, b, paper) {
  let both = 0
  let either = 0
  const inked = (frame, i) =>
    Math.abs(frame[i] - paper[0]) +
      Math.abs(frame[i + 1] - paper[1]) +
      Math.abs(frame[i + 2] - paper[2]) >
    INK
  for (let i = 0; i < a.frame.length; i += 3 * 3) {
    const inA = inked(a.frame, i)
    const inB = inked(b.frame, i)
    if (inA && inB) both++
    if (inA || inB) either++
  }
  return either ? both / either : 1
}

function mirrored(view) {
  const { frame, side } = view
  const flipped = Buffer.alloc(frame.length)
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++)
      frame.copy(flipped, (y * side + side - 1 - x) * 3, (y * side + x) * 3, (y * side + x) * 3 + 3)
  return { frame: flipped, side }
}

// Part of a view in grey, scaled to `width`, for comparing views.
async function grey(view, box, width, flip = false) {
  let image = sharp(view.frame, { raw: { width: view.side, height: view.side, channels: 3 } })
    .extract(box)
    .greyscale()
  if (flip) image = image.flop()
  const { data, info } = await image
    .resize(width, Math.max(10, Math.round((width * box.height) / box.width)))
    .blur(0.7)
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, w: info.width, h: info.height }
}

// How badly the detailed patches of `a` (eyes, folds, patterns; not plain paper) find their
// match in `b` within a small reach. The reach is what makes it tell left from right: a
// three-quarter face sits a little off-centre towards where the figure looks, a profile a
// little further the same way, and a mirrored profile far off to the other side.
function matchCost(a, b, { step, reachX, reachY, flat }) {
  const P = 10
  let total = 0
  let count = 0
  for (let py = 0; py + P <= a.h; py += step)
    for (let px = 0; px + P <= a.w; px += step) {
      let mean = 0
      let variance = 0
      for (let y = 0; y < P; y++)
        for (let x = 0; x < P; x++) mean += a.data[(py + y) * a.w + px + x]
      mean /= P * P
      for (let y = 0; y < P; y++)
        for (let x = 0; x < P; x++) variance += (a.data[(py + y) * a.w + px + x] - mean) ** 2
      if (variance / (P * P) < flat) continue
      let best = Infinity
      for (let dy = -reachY; dy <= reachY; dy++)
        for (let dx = -reachX; dx <= reachX; dx++) {
          const qy = py + dy
          const qx = px + dx
          if (qy < 0 || qx < 0 || qy + P > b.h || qx + P > b.w) continue
          let difference = 0
          for (let y = 0; y < P; y++)
            for (let x = 0; x < P; x++)
              difference += Math.abs(
                a.data[(py + y) * a.w + px + x] - b.data[(qy + y) * b.w + qx + x],
              )
          best = Math.min(best, difference)
        }
      total += best
      count++
    }
  return count ? total / count : NaN
}

// The top fifth of the figures, across the middle of the frame: the heads.
function headBox(views, paper) {
  const { side } = views[1]
  const inked = (frame, x, y) => {
    const i = (y * side + x) * 3
    return (
      Math.abs(frame[i] - paper[0]) +
        Math.abs(frame[i + 1] - paper[1]) +
        Math.abs(frame[i + 2] - paper[2]) >
      INK
    )
  }
  const rowInked = (frame, y) => {
    for (let x = 0; x < side; x += 2) if (inked(frame, x, y)) return true
    return false
  }
  let top = 0
  while (top < side - 1 && !rowInked(views[1].frame, top) && !rowInked(views[2].frame, top)) top++
  let bottom = side - 1
  while (bottom > top && !rowInked(views[1].frame, bottom)) bottom--
  const width = Math.round(side * 0.44)
  return {
    left: Math.round((side - width) / 2),
    top,
    width,
    height: Math.max(10, Math.min(side - top, Math.round((bottom - top) * 0.22))),
  }
}

// Whether the side view faces the other way from the three-quarter view, so the figure
// would start turning one way and end up facing the other. Image models draw this often,
// mostly for animals. The whole figures and the heads are compared with the side view as
// drawn and mirrored (below 1: mirrored fits better); both must lean towards mirroring,
// and neither may clearly disagree.
async function facesAway(views, paper) {
  const { side } = views[1]
  const body = { left: 0, top: 0, width: side, height: Math.round(side * 0.75) }
  const head = headBox(views, paper)
  const [b1, b2, b2m, h1, h2, h2m] = await Promise.all([
    grey(views[1], body, 160),
    grey(views[2], body, 160),
    grey(views[2], body, 160, true),
    grey(views[1], head, 200),
    grey(views[2], head, 200),
    grey(views[2], head, 200, true),
  ])
  const bodyOptions = { step: 10, reachX: 14, reachY: 5, flat: 60 }
  const headOptions = {
    step: 5,
    reachX: Math.round(h1.w * 0.14),
    reachY: Math.round(h1.h * 0.08),
    flat: 80,
  }
  const bodyRatio = matchCost(b1, b2m, bodyOptions) / matchCost(b1, b2, bodyOptions)
  const headRatio = matchCost(h1, h2m, headOptions) / matchCost(h1, h2, headOptions)
  const score = bodyRatio * headRatio
  return Number.isFinite(score) && score < FACES_AWAY && Math.max(bodyRatio, headRatio) <= 1.1
}

// The three views of a sheet, lined up on square frames, with the side view mirrored when it
// faces away from the three-quarter view (or when `mirror` says so), and how much each
// neighbouring pair overlaps (front with three-quarter, three-quarter with side).
export async function sheetViews(sheet, { mirror = 'auto' } = {}) {
  const { data, info } = await sharp(sheet)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const paper = paperColour(data, info.width, info.height)
  const figures = findFigures(data, info.width, info.height, paper)
  const views = frames(data, info.width, info.height, paper, figures)
  const flip = mirror === 'auto' ? await facesAway(views, paper) : Boolean(mirror)
  if (flip) views[2] = mirrored(views[2])
  return {
    views,
    mirrored: flip,
    overlaps: [overlap(views[0], views[1], paper), overlap(views[1], views[2], paper)],
  }
}

// Makes the turn animation for one model sheet. `mirror` is 'auto', or true or false to
// override the facing check. Throws when the sheet cannot be split into three views (for
// example when they overlap) or ffmpeg fails. Returns whether the side view was mirrored.
export async function makeTurn(sheet, target, { mirror = 'auto' } = {}) {
  const problem = await ffmpegProblem()
  if (problem) throw new Error(problem)
  const { views, overlaps, mirrored: flipped } = await sheetViews(sheet, { mirror })

  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'turn-'))
  try {
    // Front, three-quarter, side, three-quarter, front, and the front once more so the
    // interpolation reaches it.
    const order = [0, 1, 2, 1, 0, 0]
    for (const [index, view] of order.entries())
      await sharp(views[view].frame, {
        raw: { width: views[view].side, height: views[view].side, channels: 3 },
      })
        .resize(SIZE, SIZE)
        .png()
        .toFile(path.join(work, `${index}.png`))
    await run('ffmpeg', [
      ...['-y', '-loglevel', 'error', '-framerate', '2', '-i', path.join(work, '%d.png')],
      ...['-vf', `minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`],
      ...['-frames:v', String(4 * STEP), '-start_number', '0', path.join(work, 'in-%03d.png')],
    ])

    // The loop: a pause on the front, the turn to the side, a pause there and the turn back.
    // A hard step skips the middle in-betweens, where the two views blur into each other.
    const sequence = []
    const stepOverlaps = [overlaps[0], overlaps[1], overlaps[1], overlaps[0]]
    for (const [step, stepOverlap] of stepOverlaps.entries()) {
      const key = step * STEP
      const hold = step === 0 ? HOLD_FRONT : step === 2 ? HOLD_SIDE : 1
      for (let i = 0; i < hold; i++) sequence.push(key)
      for (let i = 1; i < STEP; i++)
        if (stepOverlap >= HARD_STEP || !SKIPPED.includes(i)) sequence.push(key + i)
    }
    for (const [index, frame] of sequence.entries())
      await fs.copyFile(
        path.join(work, `in-${String(frame).padStart(3, '0')}.png`),
        path.join(work, `out-${String(index).padStart(3, '0')}.png`),
      )

    await fs.mkdir(path.dirname(target), { recursive: true })
    const temporary = `${target}.tmp.mp4`
    await run('ffmpeg', [
      ...['-y', '-loglevel', 'error', '-framerate', String(FPS)],
      ...['-i', path.join(work, 'out-%03d.png'), '-vf', 'format=yuv420p'],
      ...['-c:v', 'libx264', '-preset', 'slow', '-crf', '29', '-profile:v', 'high'],
      ...['-movflags', '+faststart', '-an', temporary],
    ])
    await fs.rename(temporary, target)
  } finally {
    await fs.rm(work, { recursive: true, force: true })
  }
  return { mirrored: flipped }
}

// pipeline/art/<set>/turns.json corrects the facing check where it is wrong:
// {"mirror": ["story/slug"], "keep": ["story/slug"]}. Returns, for one character, the
// `mirror` option for makeTurn and the time the file changed (a listed character's turn is
// made again after a change), or 'auto' when the character is not listed.
export async function turnOverride(planDir, storyId, slug) {
  const file = path.join(planDir, 'turns.json')
  const stat = await fs.stat(file).catch(() => null)
  if (!stat) return { mirror: 'auto', since: 0 }
  const overrides = JSON.parse(await fs.readFile(file, 'utf8'))
  const id = `${storyId}/${slug}`
  if (overrides.mirror?.includes(id)) return { mirror: true, since: stat.mtimeMs }
  if (overrides.keep?.includes(id)) return { mirror: false, since: stat.mtimeMs }
  return { mirror: 'auto', since: 0 }
}

// Makes the turn for a sheet when it is missing, older than the sheet or older than `since`
// (or always, with force). Returns { made, mirrored }.
export async function ensureTurn(
  sheet,
  target,
  { force = false, mirror = 'auto', since = 0 } = {},
) {
  if (!force) {
    const [sheetStat, turnStat] = await Promise.all([
      fs.stat(sheet),
      fs.stat(target).catch(() => null),
    ])
    if (turnStat && turnStat.mtimeMs >= Math.max(sheetStat.mtimeMs, since))
      return { made: false, mirrored: false }
  }
  const { mirrored: flipped } = await makeTurn(sheet, target, { mirror })
  return { made: true, mirrored: flipped }
}
