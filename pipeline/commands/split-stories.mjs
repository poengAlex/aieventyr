import { parseArgs } from '../lib/shared.mjs'
import { stageSplitStories } from '../lib/stages.mjs'

await stageSplitStories(parseArgs(process.argv.slice(2)))
