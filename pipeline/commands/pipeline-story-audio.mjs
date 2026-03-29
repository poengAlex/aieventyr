import { parseArgs } from '../lib/shared.mjs'
import { runPipelineStoryAudio } from '../lib/stages.mjs'

await runPipelineStoryAudio(parseArgs(process.argv.slice(2)))
