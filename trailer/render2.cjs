// node trailer/render2.cjs [workers=4] [html=trailer/trailer2.html]
// 60 fps output with real temporal motion blur: every output frame is the average of two
// sub-frames rendered 1/240 s either side of it (a 180° shutter), blended by ffmpeg's tmix.
const { chromium } = require('playwright'); const path = require('node:path'); const { spawn } = require('node:child_process'); const fs = require('node:fs');
const FPS = 60, W = Number(process.argv[2] || 4), HTML = process.argv[3] || 'trailer/trailer2.html';
(async () => {
  const out = path.resolve('trailer/out'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const meta = await b.newPage(); await meta.goto('file://' + path.resolve(HTML)); await meta.waitForFunction(() => window.READY);
  const { DUR, CUES, BPM } = await meta.evaluate(() => ({ DUR: window.DUR, CUES: window.CUES, BPM: window.BPM })); fs.writeFileSync(out + '/cues2.json', JSON.stringify({ DUR, CUES, BPM })); await meta.close();
  const N = Math.round(DUR * FPS), per = Math.ceil(N / W); const t0 = Date.now();
  await Promise.all([...Array(W)].map(async (_, w) => {
    const a = w * per, z = Math.min(N, a + per); if (a >= z) return;
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    p.on('pageerror', e => console.log('ERR', w, e.message));
    await p.goto('file://' + path.resolve(HTML)); await p.waitForFunction(() => window.READY);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * 2), '-c:v', 'mjpeg', '-i', '-',
      '-vf', "tmix=frames=2:weights='1 1',select='mod(n\\,2)',setpts=N/(60*TB)", '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', `${out}/v2seg_${w}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < z; f++) {
      for (const d of [-1 / 240, 1 / 240]) {
        await p.evaluate(t => render(t), Math.max(0, f / FPS + d));
        const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
      if (w === 0 && f % 120 === 0) console.log(`w0 ${f - a}/${z - a} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); await p.close();
  }));
  await b.close(); console.log('frames', N, 'secs', ((Date.now() - t0) / 1000).toFixed(0));
})();
