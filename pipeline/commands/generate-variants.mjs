import { parseArgs } from '../lib/shared.mjs'
import { stageGenerateVariants } from '../lib/stages.mjs'

await stageGenerateVariants(parseArgs(process.argv.slice(2)))
