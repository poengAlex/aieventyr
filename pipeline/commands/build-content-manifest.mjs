import { parseArgs } from '../lib/shared.mjs'
import { stageBuildContentManifest } from '../lib/stages.mjs'

await stageBuildContentManifest(parseArgs(process.argv.slice(2)))
