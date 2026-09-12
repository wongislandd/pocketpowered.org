import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { onRequest } from '../functions/resonance/classics/_middleware.js';
import { onRequest as assetRequest } from '../functions/resonance/classics/[[path]].js';

test('classic audio, stems and timed lyrics fail closed outside the U.S.', async () => {
  for (const country of ['CA', 'GB', undefined]) {
    for (const asset of ['source.mp3', 'vocals.mp3', 'accompaniment.mp3', 'display.json', 'lyrics.vtt']) {
      const request = new Request(`https://pocketpowered.org/resonance/classics/song/${asset}?download=1`, { headers: { 'CF-IPCountry': 'US', Range: 'bytes=0-99' } });
      Object.defineProperty(request, 'cf', { value: { country } });
      let reachedAsset = false;
      const response = await onRequest({ request, next: async () => { reachedAsset = true; return new Response('audio'); } });
      assert.equal(response.status, 451);
      assert.equal(reachedAsset, false);
      assert.match(response.headers.get('Cache-Control'), /no-store/);
    }
  }
});

test('private classic assets support full, head, suffix and seek requests', async () => {
  const content = new TextEncoder().encode('0123456789').buffer;
  const keys = [];
  const env = { RESONANCE_CLASSICS: { get: async (key, type) => { keys.push(key); assert.equal(type,'arrayBuffer'); return content; } } };
  const params = { path: ['i-got-rhythm','source.mp3'] };
  for (const [range, expected, status] of [[null,'0123456789',200],['bytes=2-5','2345',206],['bytes=7-','789',206],['bytes=-3','789',206],['bytes=2-99','23456789',206],['bytes=30-','',416],['bytes=-0','',416],['bytes=0-1,4-5','',416]]) {
    const request = new Request('https://pocketpowered.org/resonance/classics/i-got-rhythm/source.mp3', { headers: range ? { Range: range } : {} });
    const response = await assetRequest({ request, env, params });
    assert.equal(response.status,status); assert.equal(await response.text(),expected);
    if(status!==416) assert.equal(response.headers.get('Content-Length'),String(expected.length));
  }
  const request = new Request('https://pocketpowered.org/resonance/classics/i-got-rhythm/source.mp3',{method:'HEAD'});
  const head = await assetRequest({request,env,params});
  assert.equal(head.headers.get('Content-Length'),'10');assert.equal(await head.text(),'');
  assert.ok(keys.every(key=>key==='classics-20260912-v1/i-got-rhythm/source.mp3'));
  const before=keys.length;
  const missing=await assetRequest({request,env,params:{path:['i-got-rhythm','../source.mp3']}});
  assert.equal(missing.status,404);assert.equal(keys.length,before);
  assert.equal((await assetRequest({request,env:{},params})).status,503);
});

test('U.S. requests preserve streaming range responses without shared caching', async () => {
  const request = new Request('https://pocketpowered.org/resonance/classics/song/source.mp3');
  Object.defineProperty(request, 'cf', { value: { country: 'US' } });
  const response = await onRequest({ request, next: async () => new Response('part', { status: 206, headers: { 'Content-Range': 'bytes 0-3/100', 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=999' } }) });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('Content-Range'), 'bytes 0-3/100');
  assert.equal(response.headers.get('Content-Type'), 'audio/mpeg');
  assert.equal(await response.text(), 'part');
  for (const header of ['Cache-Control', 'CDN-Cache-Control', 'Cloudflare-CDN-Cache-Control']) assert.match(response.headers.get(header), /no-store/);
  const routes = JSON.parse(fs.readFileSync(new URL('../public/_routes.json', import.meta.url)));
  assert.ok(routes.include.includes('/resonance/classics/*'));
  assert.ok(routes.include.includes('/tfc-amenities/*'));
});
