// Small, immutable demo recordings live in private KV, never in this public repo.
// The parent middleware restricts every response to U.S. requests and no-store.
const release = 'classics-20260912-v1';
const songs = new Set(['dream-a-little-dream-of-me', 'georgia-on-my-mind', 'on-the-sunny-side-of-the-street', 'i-got-rhythm', 'singin-in-the-rain', 'aint-misbehavin']);
const types = { 'source.mp3': 'audio/mpeg', 'vocals.mp3': 'audio/mpeg', 'accompaniment.mp3': 'audio/mpeg', 'display.json': 'application/json', 'lyrics.txt': 'text/plain; charset=utf-8', 'lyrics.vtt': 'text/vtt; charset=utf-8', 'provenance.json': 'application/json' };

export async function onRequest({ request, env, params }) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  const parts = Array.isArray(params.path) ? params.path : String(params.path || '').split('/');
  if (parts.length !== 2 || !songs.has(parts[0]) || !Object.hasOwn(types, parts[1])) return new Response('Not found', { status: 404 });
  if (!env.RESONANCE_CLASSICS) return new Response('This record is temporarily unavailable.', { status: 503 });
  const bytes = await env.RESONANCE_CLASSICS.get(`${release}/${parts.join('/')}`, 'arrayBuffer');
  if (!bytes) return new Response('Not found', { status: 404 });
  const total = bytes.byteLength;
  const headers = new Headers({ 'Content-Type': types[parts[1]], 'Content-Length': String(total), 'Accept-Ranges': 'bytes' });
  const range = request.headers.get('Range');
  if (range && request.method === 'GET') {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    const start = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= total) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(bytes.slice(start, end + 1), { status: 206, headers });
  }
  return new Response(request.method === 'HEAD' ? null : bytes, { headers });
}
