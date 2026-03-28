import { parseArgs } from '../lib/shared.mjs'
import { stageExtractSource } from '../lib/stages.mjs'

await stageExtractSource(parseArgs(process.argv.slice(2)))
