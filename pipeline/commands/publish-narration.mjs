// Puts a recording from pipeline/work/narration on the site (see pipeline/lib/narration.mjs).
// generate-narration.mjs does this itself when it reads with the edition's own voice; use
// this for a test recording made with --voice or --plain.
//
//   npm run narration:publish -- --story=asketrol --variant=child-friendly --take=child-friendly-martin
//
// --export makes the site's audio again from the recordings for every edition read aloud
// (or one --story's), e.g. after a change to encodeSiteAudio:
//
//   npm run narration:publish -- --export
import { parseArgs } from '../lib/shared.mjs'
import { exportNarrationAudio, publishNarration } from '../lib/narration.mjs'

const args = parseArgs(process.argv.slice(2))
const take = process.argv
  .slice(2)
  .find((part) => part.startsWith('--take='))
  ?.slice('--take='.length)
if (process.argv.includes('--export')) {
  const jobs = await exportNarrationAudio({ story: args.story })
  for (const job of jobs) console.log(`${job.story}/${job.variant}: ${job.take}`)
  console.log(`${jobs.length} recordings encoded`)
} else {
  if (!args.story || !args.variant || !take) {
    throw new Error('Usage: --story=<id> --variant=<edition> --take=<recording name>, or --export')
  }
  const { paragraphs, seconds } = await publishNarration({
    story: args.story,
    variant: args.variant,
    take,
  })
  console.log(
    `${args.story}/${args.variant}: ${take}, ${paragraphs} paragraphs, ${Math.round(seconds)} s`,
  )
}
