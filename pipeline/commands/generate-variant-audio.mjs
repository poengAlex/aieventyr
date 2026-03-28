import { parseArgs } from '../lib/shared.mjs'
import { stageGenerateVariantAudio } from '../lib/stages.mjs'

await stageGenerateVariantAudio(parseArgs(process.argv.slice(2)))
