import { parseArgs } from '../lib/shared.mjs'
import { stageGenerateVariantCharacterImages } from '../lib/stages.mjs'

await stageGenerateVariantCharacterImages(parseArgs(process.argv.slice(2)))
