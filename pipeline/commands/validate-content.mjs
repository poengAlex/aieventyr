import { parseArgs } from '../lib/shared.mjs'
import { stageValidateContent } from '../lib/stages.mjs'

await stageValidateContent(parseArgs(process.argv.slice(2)))
