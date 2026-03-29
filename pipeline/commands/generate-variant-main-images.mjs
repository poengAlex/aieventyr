import { parseArgs } from '../lib/shared.mjs'
import { stageGenerateVariantMainImages } from '../lib/stages.mjs'

await stageGenerateVariantMainImages(parseArgs(process.argv.slice(2)))
