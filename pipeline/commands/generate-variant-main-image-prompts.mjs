import { parseArgs } from '../lib/shared.mjs'
import { stageGenerateVariantMainImagePrompts } from '../lib/stages.mjs'

await stageGenerateVariantMainImagePrompts(parseArgs(process.argv.slice(2)))
