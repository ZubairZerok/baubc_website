(async()=>{
const { chromium } = require('playwright');
const path = require('node:path');
const out = process.argv[2]; const times = process.argv.slice(3).map(Number);
const b = await chromium.launch({ args: ['--enable-gpu-rasterization','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type()==='error' && console.log('CONSOLE', m.text()));
await p.goto('file://' + path.resolve(process.env.TRAILER || 'trailer/trailer.html'));
await p.waitForFunction(() => window.READY);
for (const t of times) { await p.evaluate(t => render(t), t); await p.screenshot({ path: `${out}/t${String(t).padStart(5,'0')}.jpg`, quality: 70, type: 'jpeg' }); }
await b.close();
})();
