import { parseArgs } from '../lib/shared.mjs'
import { stageBuildInlineScenes } from '../lib/stages.mjs'

await stageBuildInlineScenes(parseArgs(process.argv.slice(2)))
