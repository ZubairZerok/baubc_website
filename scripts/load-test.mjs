// Small HTTP load test with no dependencies.
//   node scripts/load-test.mjs http://localhost:3000 [concurrency=50] [seconds=20]
// Cycles through the public routes with N concurrent clients and reports throughput, latency percentiles and errors.
const [base = 'http://localhost:3000', conc = '50', secs = '20'] = process.argv.slice(2);
const routes = ['/', '/events', '/events/startup-summit-2027', '/insights', '/insights/prothom-pitch-deck', '/insights/decoded-monpura-2009',
  '/members', '/members/lamia-chowdhury', '/reels', '/contact', '/wings', '/about', '/join', '/advisors', '/gallery', '/resources', '/privacy', '/verify',
  '/sitemap.xml', '/robots.txt'];
const until = Date.now() + Number(secs) * 1000;
const lat = []; const codes = {}; const perRoute = {}; let bytes = 0;
async function worker(id) {
  let i = id;
  while (Date.now() < until) {
    const path = routes[i++ % routes.length];
    const t = performance.now();
    try {
      const r = await fetch(base + path, { headers: { 'user-agent': 'baubc-load-test' } });
      const body = await r.arrayBuffer(); bytes += body.byteLength;
      codes[r.status] = (codes[r.status] ?? 0) + 1;
      if (r.status >= 500) (perRoute[path] ??= []).push(r.status);
    } catch (e) { codes.ERR = (codes.ERR ?? 0) + 1; (perRoute[path] ??= []).push('ERR'); }
    lat.push(performance.now() - t);
  }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: Number(conc) }, (_, i) => worker(i)));
const s = (Date.now() - t0) / 1000;
lat.sort((a, b) => a - b);
const pct = (p) => lat[Math.min(lat.length - 1, Math.floor(lat.length * p))].toFixed(0);
console.log(`${lat.length} requests in ${s.toFixed(1)} s with ${conc} concurrent clients → ${(lat.length / s).toFixed(0)} req/s, ${(bytes / s / 1e6).toFixed(1)} MB/s`);
console.log(`latency ms  p50 ${pct(0.5)}  p90 ${pct(0.9)}  p95 ${pct(0.95)}  p99 ${pct(0.99)}  max ${lat[lat.length - 1].toFixed(0)}`);
console.log('status codes', codes);
if (Object.keys(perRoute).length) console.log('failures by route', perRoute);
process.exit(Object.keys(perRoute).length ? 1 : 0);
