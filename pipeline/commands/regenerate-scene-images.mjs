import { parseArgs } from '../lib/shared.mjs'
import { stageRegenerateSceneImages } from '../lib/stages.mjs'

await stageRegenerateSceneImages(parseArgs(process.argv.slice(2)))
