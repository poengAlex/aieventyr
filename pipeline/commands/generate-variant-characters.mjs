import { parseArgs } from '../lib/shared.mjs'
import { stageGenerateVariantCharacters } from '../lib/stages.mjs'

await stageGenerateVariantCharacters(parseArgs(process.argv.slice(2)))
