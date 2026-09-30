import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import fs from 'fs';
const FF = '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
const mode = process.argv[2];              // 'stills' t1,t2,...  |  'video' fps from to
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--disable-gpu-vsync', '--force-color-profile=srgb', '--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'load' });
await page.evaluate(() => window.ready);
if (mode === 'stills') {
  fs.mkdirSync('stills', { recursive: true });
  for (const t of process.argv[3].split(',').map(Number)) {
    await page.evaluate(t => window.seek(t), t);
    await page.screenshot({ path: `stills/t${t.toFixed(2).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 88 });
  }
} else {
  const fps = +process.argv[3] || 60, from = +process.argv[4] || 0, to = +process.argv[5] || 60, out = process.argv[6] || 'video_noaudio.mp4';
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
  const t0 = Date.now();
  for (let n = n0; n < n1; n++) {
    await page.evaluate(t => window.seek(t), n / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (n % 120 === 0) console.log('frame', n, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await browser.close();
