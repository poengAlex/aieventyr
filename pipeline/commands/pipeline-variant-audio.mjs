import { parseArgs } from '../lib/shared.mjs'
import { runPipelineVariantAudio } from '../lib/stages.mjs'

await runPipelineVariantAudio(parseArgs(process.argv.slice(2)))
