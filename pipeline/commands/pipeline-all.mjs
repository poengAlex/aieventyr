import { parseArgs } from '../lib/shared.mjs'
import { runPipelineAll } from '../lib/stages.mjs'

await runPipelineAll(parseArgs(process.argv.slice(2)))
