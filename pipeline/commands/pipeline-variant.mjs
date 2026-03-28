import { parseArgs } from '../lib/shared.mjs'
import { runPipelineVariant } from '../lib/stages.mjs'

await runPipelineVariant(parseArgs(process.argv.slice(2)))
