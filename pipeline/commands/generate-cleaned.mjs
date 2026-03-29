import { parseArgs } from '../lib/shared.mjs'
import { stageGenerateCleaned } from '../lib/stages.mjs'

await stageGenerateCleaned(parseArgs(process.argv.slice(2)))
