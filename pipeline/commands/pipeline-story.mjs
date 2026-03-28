import { parseArgs } from '../lib/shared.mjs'
import { runPipelineStory } from '../lib/stages.mjs'

await runPipelineStory(parseArgs(process.argv.slice(2)))
