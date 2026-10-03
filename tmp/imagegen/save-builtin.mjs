import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const jobs = JSON.parse(await fs.readFile('/tmp/aieventyr-child-jobs.json','utf8'));
const [index, source] = process.argv.slice(2);
const j = jobs[Number(index)];
const prompt = j.prompt + `\n\nUse case: illustration-story. ${j.size === '1024x1024' ? 'Square format, 1024 × 1024.' : 'Landscape format, 1536 × 1024.'}`;
await fs.mkdir(path.dirname(j.out), {recursive:true});
try { await fs.access(j.out+'.webp'); throw new Error('Destination already exists: '+j.out); } catch(e) {if(e.code !== 'ENOENT') throw e;}
await sharp(source).webp({quality:95}).toFile(j.out+'.webp');
await fs.writeFile(j.out+'.prompt.txt',prompt);
await fs.appendFile('pipeline/art-raw/child-friendly/builtin-generation-log.jsonl',JSON.stringify({label:j.label,method:'built-in image_gen',source,output:j.out+'.webp',createdAt:new Date().toISOString()})+'\n');
console.log(j.label);
