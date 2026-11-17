// node trailer/render.cjs <workers>  -> trailer/out/seg_N.mp4 + cues.json
const { chromium } = require('playwright'); const path = require('node:path'); const { spawn } = require('node:child_process'); const fs = require('node:fs');
const FPS = 60, W = Number(process.argv[2] || 4);
(async () => {
  const out = path.resolve('trailer/out'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const meta = await b.newPage(); await meta.goto('file://' + path.resolve('trailer/trailer.html')); await meta.waitForFunction(() => window.READY);
  const { DUR, CUES } = await meta.evaluate(() => ({ DUR: window.DUR, CUES: window.CUES })); fs.writeFileSync(out + '/cues.json', JSON.stringify({ DUR, CUES })); await meta.close();
  const N = Math.round(DUR * FPS), per = Math.ceil(N / W); const t0 = Date.now();
  await Promise.all([...Array(W)].map(async (_, w) => {
    const a = w * per, z = Math.min(N, a + per); if (a >= z) return;
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    p.on('pageerror', e => console.log('ERR', w, e.message));
    await p.goto('file://' + path.resolve('trailer/trailer.html')); await p.waitForFunction(() => window.READY);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), `${out}/seg_${w}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
    // warm-up frame for state that depends on the previous one
    await p.evaluate(t => render(t), Math.max(0, a / FPS - 1 / FPS));
    for (let f = a; f < z; f++) {
      await p.evaluate(t => render(t), f / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 94 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (w === 0 && f % 120 === 0) console.log(`w0 ${f - a}/${z - a} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); await p.close();
  }));
  await b.close(); console.log('frames', N, 'secs', ((Date.now() - t0) / 1000).toFixed(0));
})();
