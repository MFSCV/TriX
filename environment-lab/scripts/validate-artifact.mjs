import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../dist/server/index.js',import.meta.url),'utf8'),manifest=JSON.parse(await readFile(new URL('../dist/.openai/hosting.json',import.meta.url),'utf8'));
if(manifest.project_id!==undefined)assert.equal(typeof manifest.project_id,'string');assert.equal(manifest.r2,'BUCKET');assert.ok(!manifest.static);
let m;try{m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}catch(e){console.error(e.name+': '+e.message);process.exit(1);}assert.equal(typeof m.default.fetch,'function');
const response=await m.default.fetch(new Request('https://trix.test/'),{});assert.equal(response.status,200);assert.match(await response.text(),/Plan where your/);console.log('Worker artifact, optional site identity, storage binding and embedded page verified.');
