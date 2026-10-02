import { acceptHMRUpdate, defineStore } from 'pinia'
import type { Track } from 'src/logic/listen'
import { useSettingsStore } from 'src/stores/settings'

// The narration player. One audio element serves the whole site, so a tale keeps playing
// from page to page and the next tale can follow without a new tap (browsers let an element
// that has been played once play again).
let audio: HTMLAudioElement | null = null
let frame = 0
let lastSaved = 0
const FADE = 6000

const SPEEDS = [0.8, 0.9, 1, 1.1, 1.25]

function element() {
  if (!audio) {
    audio = new Audio()
    audio.preload = 'auto'
  }
  return audio
}

// The last item whose start is at or before the time, by binary search.
function lastStarted<T>(items: T[], start: (item: T) => number, time: number) {
  let low = 0
  let high = items.length - 1
  let found = -1
  while (low <= high) {
    const middle = (low + high) >> 1
    if (start(items[middle]!) <= time) {
      found = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  return found
}

export const usePlayerStore = defineStore('player', {
  state: () => ({
    track: null as Track | null,
    playing: false,
    loading: false,
    failed: false,
    time: 0,
    // The paragraph and word being read; -1 before the first.
    paragraph: -1,
    word: -1,
    // Ends with the tale was reached; the player bar offers the next one.
    ended: false,
    // Sleep: stop at this moment (ms), or at the end of the tale.
    sleepAt: null as number | null,
    sleepAfterTale: false,
    // Bumped when the lock screen's "next" is pressed; the player bar moves on.
    nextRequests: 0,
  }),
  getters: {
    seconds: (state) => state.track?.narration.seconds ?? 0,
    // The word being read, as its place in the paragraph.
    wordRange(state): [number, number] | null {
      const word = state.track?.narration.paragraphs[state.paragraph]?.words[state.word]
      return word ? [word[0], word[1]] : null
    },
    isTrack: (state) => (storyId: string, variant: string) =>
      state.track?.storyId === storyId && state.track.variant === variant,
    speeds: () => SPEEDS,
  },
  actions: {
    // Where to start a tale: where the listener left it, unless that was near the end.
    resumeTime(storyId: string, variant: string, seconds: number) {
      const last = useSettingsStore().lastListened
      return last?.storyId === storyId && last.variant === variant && last.time < seconds - 10
        ? last.time
        : 0
    },
    // Starts the audio inside the tap that asked for it, as Safari requires, while the
    // timings are still loading; load() then takes over without starting again.
    prime(src: string, at: number) {
      const player = element()
      this.bind()
      if (player.src !== new URL(src, window.location.href).href) {
        this.track = null
        this.paragraph = -1
        this.word = -1
        player.src = src
        player.playbackRate = useSettingsStore().listenSpeed
        player.currentTime = at
      }
      void player.play().catch(() => {
        // refused; the play button is there for another try
      })
    },
    // Starts a tale, where the listener left it unless `at` says otherwise.
    async load(track: Track, options: { autoplay?: boolean; at?: number } = {}) {
      const player = element()
      this.bind()
      if (!this.isTrack(track.storyId, track.variant)) {
        const primed = player.src === new URL(track.src, window.location.href).href
        this.track = track
        this.failed = false
        this.ended = false
        if (!primed) {
          player.src = track.src
          player.playbackRate = useSettingsStore().listenSpeed
          this.seek(
            options.at ?? this.resumeTime(track.storyId, track.variant, track.narration.seconds),
          )
        } else if (options.at !== undefined) {
          this.seek(options.at)
        } else {
          this.tick()
        }
        this.describe()
      } else if (options.at !== undefined) {
        this.seek(options.at)
      }
      if (options.autoplay) await this.play()
    },
    async play() {
      const player = element()
      if (!this.track) return
      if (this.ended) {
        this.ended = false
        this.seek(0)
      }
      this.loading = true
      try {
        await player.play()
      } catch {
        // The browser wants a tap first; the play button stays there for it.
      } finally {
        this.loading = false
      }
    },
    pause() {
      element().pause()
    },
    toggle() {
      if (this.playing) this.pause()
      else void this.play()
    },
    seek(time: number) {
      const player = element()
      const clamped = Math.max(0, Math.min(time, this.seconds || time))
      player.currentTime = clamped
      this.time = clamped
      this.ended = false
      this.locate()
    },
    skip(delta: number) {
      this.seek(element().currentTime + delta)
    },
    // From the start of a paragraph.
    seekParagraph(index: number) {
      const paragraph = this.track?.narration.paragraphs[Math.max(0, index)]
      if (paragraph) this.seek(Math.max(0, paragraph.start - 0.15))
    },
    setSpeed(speed: number) {
      const settings = useSettingsStore()
      settings.listenSpeed = speed
      element().playbackRate = speed
    },
    // minutes: stop after that long; 'tale': at the end of this tale; null: no sleep.
    setSleep(minutes: number | 'tale' | null) {
      this.sleepAfterTale = minutes === 'tale'
      this.sleepAt = typeof minutes === 'number' ? Date.now() + minutes * 60_000 : null
      element().volume = 1
    },
    close() {
      const player = element()
      player.pause()
      player.removeAttribute('src')
      player.load()
      this.track = null
      this.playing = false
      this.ended = false
      this.paragraph = -1
      this.word = -1
      this.setSleep(null)
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = null
    },

    // ---- following the audio

    locate() {
      const paragraphs = this.track?.narration.paragraphs ?? []
      const paragraph = lastStarted(paragraphs, (item) => item.start, this.time + 0.05)
      this.paragraph = paragraph
      const words = paragraphs[paragraph]?.words ?? []
      this.word = lastStarted(words, (word) => word[2], this.time + 0.05)
    },
    tick() {
      const player = element()
      this.time = player.currentTime
      this.locate()
      const settings = useSettingsStore()
      const track = this.track
      if (track && Date.now() - lastSaved > 4000) {
        lastSaved = Date.now()
        settings.lastListened = {
          storyId: track.storyId,
          variant: track.variant,
          time: this.time,
          at: Date.now(),
        }
      }
      // Sleep: the voice fades over the last seconds, then stops.
      if (this.sleepAt) {
        const left = this.sleepAt - Date.now()
        if (left <= 0) {
          player.pause()
          this.setSleep(null)
        } else if (left < FADE) {
          player.volume = Math.max(0, left / FADE)
        }
      }
      if ('mediaSession' in navigator && this.seconds && navigator.mediaSession.setPositionState) {
        try {
          navigator.mediaSession.setPositionState({
            duration: this.seconds,
            playbackRate: player.playbackRate,
            position: Math.min(this.time, this.seconds),
          })
        } catch {
          // some browsers reject a position past the decoded duration
        }
      }
    },
    loop() {
      cancelAnimationFrame(frame)
      const step = () => {
        this.tick()
        if (this.playing) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    },

    // The audio element's events and the lock screen's buttons, set up once.
    bind() {
      const player = element()
      if (player.dataset.bound) return
      player.dataset.bound = '1'
      player.addEventListener('play', () => {
        this.playing = true
        this.loop()
      })
      player.addEventListener('pause', () => {
        this.playing = false
        this.tick()
      })
      // timeupdate keeps the place, the sleep timer and the lock screen going while the
      // page is hidden and animation frames stop.
      player.addEventListener('timeupdate', () => this.tick())
      player.addEventListener('ended', () => {
        this.playing = false
        this.ended = true
        const settings = useSettingsStore()
        if (settings.lastListened?.storyId === this.track?.storyId) settings.lastListened = null
        // sleepAfterTale stays set, so the player bar knows not to go on to the next tale.
      })
      player.addEventListener('error', () => {
        if (player.getAttribute('src')) this.failed = true
      })
      if (!('mediaSession' in navigator)) return
      const session = navigator.mediaSession
      const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
        ['play', () => void this.play()],
        ['pause', () => this.pause()],
        ['seekbackward', (details) => this.skip(-(details.seekOffset ?? 15))],
        ['seekforward', (details) => this.skip(details.seekOffset ?? 15)],
        ['seekto', (details) => this.seek(details.seekTime ?? 0)],
        ['previoustrack', () => this.seek(0)],
        ['nexttrack', () => (this.nextRequests += 1)],
      ]
      for (const [action, handler] of handlers) {
        try {
          session.setActionHandler(action, handler)
        } catch {
          // not every browser knows every action
        }
      }
    },
    // What the lock screen and the notification show.
    describe() {
      const track = this.track
      if (!track || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.narration.voice,
        album: track.variant === 'english' ? 'Norwegian Folk Tales' : 'Norske folkeeventyr',
        artwork: [{ src: track.cover, sizes: '1024x1024' }],
      })
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(usePlayerStore, import.meta.hot))
}
