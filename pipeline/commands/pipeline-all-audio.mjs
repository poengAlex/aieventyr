import { parseArgs } from '../lib/shared.mjs'
import { runPipelineAllAudio } from '../lib/stages.mjs'

await runPipelineAllAudio(parseArgs(process.argv.slice(2)))
