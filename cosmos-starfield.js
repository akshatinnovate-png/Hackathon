/**
 * Full-page animated background: parallax stars, dust and a soft nebula.
 * Adapts to the device (star count, pixel ratio, frame rate), pauses when the
 * tab is hidden, and draws a single still frame when reduced motion is on.
 */
import { createRng } from './utils.js';

const TAU = Math.PI * 2;
const STAR_COUNTS = [380, 900, 1600];
const DUST_COUNTS = [30, 70, 130];
const NEBULA_BLOBS = [7, 11, 15];
const WARP_MS = 2200;

/** 0 = light, 1 = standard, 2 = rich. Chosen from viewport and CPU cores. */
export function pickQualityTier(width, cores) {
  return cores >= 8 && width >= 1200 ? 2 : width >= 760 ? 1 : 0;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{reducedMotion: boolean}} options
 */
export function createStarfield(canvas, { reducedMotion }) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { start() {}, stop() {}, setPointer() {}, destroy() {} };

  const tier = pickQualityTier(window.innerWidth, navigator.hardwareConcurrency || 4);
  const dpr = Math.min(window.devicePixelRatio || 1, tier === 2 ? 2 : tier === 1 ? 1.5 : 1.25);
  const frameGap = tier === 0 ? 1000 / 30 : 0; // cap light devices at 30 fps

  const rand = createRng(20260919);
  const stars = Array.from({ length: STAR_COUNTS[tier] }, () => {
    const clustered = rand() < 0.35;
    const cx = clustered ? (rand() * 2 - 1) * 0.55 : 0;
    const cy = clustered ? (rand() * 2 - 1) * 0.55 : 0;
    const spread = clustered ? 0.32 : 1.25;
    const tint = rand();
    return {
      x: cx + (rand() * 2 - 1) * spread,
      y: cy + (rand() * 2 - 1) * spread,
      z: 0.06 + rand() * 0.94,
      r: 0.4 + rand() * 1.5,
      b: 0.35 + rand() * 0.65,
      phase: rand() * TAU,
      twinkle: 0.4 + rand() * 1.8,
      color: tint < 0.08 ? '#ffd7a8' : tint < 0.2 ? '#b9d8ff' : '#f6f2ea',
    };
  });
  stars.sort((a, b) => (a.color < b.color ? -1 : 1)); // batch fillStyle changes

  const dust = Array.from({ length: DUST_COUNTS[tier] }, () => ({
    x: rand() * 2 - 1, y: rand() * 2 - 1, z: 0.05 + rand() * 0.5, r: 0.6 + rand() * 1.6, a: 0.15 + rand() * 0.4,
  }));

  const nebula = document.createElement('canvas');
  const cam = { z: 0, px: 0, py: 0, tpx: 0, tpy: 0 };
  let W = 0;
  let H = 0;
  let sky = null;
  let raf = 0;
  let startedAt = 0;
  let lastFrame = 0;
  let running = false;

  function buildNebula() {
    const scale = 0.4;
    nebula.width = Math.max(2, Math.round(W * scale));
    nebula.height = Math.max(2, Math.round(H * scale));
    const n = nebula.getContext('2d');
    if (!n) return;
    const r = createRng(777);
    n.globalCompositeOperation = 'lighter';
    const colors = ['rgba(64,52,150,', 'rgba(38,84,150,', 'rgba(120,52,140,', 'rgba(32,120,138,', 'rgba(150,84,44,'];
    for (let i = 0; i < NEBULA_BLOBS[tier]; i++) {
      const bx = r() * nebula.width;
      const by = r() * nebula.height;
      const rad = nebula.width * (0.12 + r() * 0.3);
      const col = colors[Math.floor(r() * colors.length)];
      const g = n.createRadialGradient(bx, by, 0, bx, by, rad);
      g.addColorStop(0, `${col}${0.16 + r() * 0.14})`);
      g.addColorStop(0.5, `${col}0.05)`);
      g.addColorStop(1, `${col}0)`);
      n.fillStyle = g;
      n.beginPath();
      n.arc(bx, by, rad, 0, TAU);
      n.fill();
    }
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    sky = ctx.createLinearGradient(0, 0, W * 0.4, H);
    sky.addColorStop(0, '#08070d');
    sky.addColorStop(0.55, '#0a0812');
    sky.addColorStop(1, '#07060b');
    buildNebula();
    draw(performance.now());
  }

  function draw(now) {
    const t = (now - startedAt) / 1000;
    const warp = reducedMotion ? 1 : Math.min(1, (now - startedAt) / WARP_MS);
    const eased = warp < 0.5 ? 4 * warp ** 3 : 1 - (-2 * warp + 2) ** 3 / 2;
    cam.z = eased * 0.88;
    cam.px += (cam.tpx - cam.px) * 0.05;
    cam.py += (cam.tpy - cam.py) * 0.05;

    const cx = W / 2;
    const cy = H / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const scale = 1.08 + cam.z * 0.12;
    const drift = reducedMotion ? 0 : Math.sin(t * 0.05) * 14;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(nebula, -W * (scale - 1) / 2 + drift - cam.px * 12, -H * (scale - 1) / 2 + (reducedMotion ? 0 : Math.cos(t * 0.04) * 10) - cam.py * 12, W * scale, H * scale);
    ctx.globalAlpha = 1;

    const streak = !reducedMotion && warp < 1;
    const zf = cam.z * 0.9;
    let currentColor = '';
    if (streak) {
      ctx.beginPath();
    }
    for (const s of stars) {
      let ez = s.z - zf;
      if (ez <= 0.02) ez += 1;
      const k = 0.85 / ez;
      const sx = cx + s.x * cx * k + cam.px * (1.2 - ez) * 26;
      const sy = cy + s.y * cy * k + cam.py * (1.2 - ez) * 26;
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      const twinkle = reducedMotion ? 0.8 : 0.6 + 0.4 * Math.sin(t * s.twinkle + s.phase);
      const alpha = Math.min(1, s.b * twinkle * Math.min(1, k * 0.9));
      if (alpha < 0.03) continue;
      const r = Math.min(3.4, s.r * Math.max(0.5, k * 0.55));
      if (streak && k > 1.6) {
        // Streaks are collected into one path and stroked once below.
        const pk = 0.85 / (ez + 0.045);
        ctx.moveTo(cx + s.x * cx * pk + cam.px * (1.2 - ez) * 26, cy + s.y * cy * pk + cam.py * (1.2 - ez) * 26);
        ctx.lineTo(sx, sy);
        continue;
      }
      if (s.color !== currentColor) {
        currentColor = s.color;
        ctx.fillStyle = s.color;
      }
      ctx.globalAlpha = alpha;
      const size = r * 1.6;
      ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
    }
    if (streak) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#f6f2ea';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }

    ctx.fillStyle = '#cfe4ff';
    for (const d of dust) {
      let ez = d.z - zf * 0.6;
      if (ez <= 0.02) ez += 0.6;
      const k = 0.6 / ez;
      const sx = cx + d.x * cx * k + cam.px * 40;
      const sy = cy + (d.y + (reducedMotion ? 0 : ((t * 0.012) % 2) - 1)) * cy * k;
      if (sx < 0 || sx > W || sy < 0 || sy > H) continue;
      ctx.globalAlpha = d.a * Math.min(1, k * 0.4);
      ctx.fillRect(sx, sy, d.r, d.r);
    }
    ctx.globalAlpha = 1;

    if (warp < 1) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.42);
      const glow = Math.max(0, warp - 0.45) / 0.55;
      g.addColorStop(0, `rgba(240,165,94,${0.5 * glow})`);
      g.addColorStop(0.35, `rgba(198,113,57,${0.18 * glow})`);
      g.addColorStop(1, 'rgba(198,113,57,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (frameGap && now - lastFrame < frameGap) return;
    lastFrame = now;
    draw(now);
  }

  function start() {
    if (running || reducedMotion) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const onVisibility = () => (document.hidden ? stop() : start());
  const onResize = () => resize();
  const onPointer = (e) => setPointer(e.clientX / window.innerWidth, e.clientY / window.innerHeight);

  /** @param {number} nx 0..1 @param {number} ny 0..1 */
  function setPointer(nx, ny) {
    cam.tpx = (nx - 0.5) * 2;
    cam.tpy = (ny - 0.5) * 2;
  }

  startedAt = performance.now();
  resize();
  window.addEventListener('resize', onResize, { passive: true });
  if (!reducedMotion) window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  return {
    start,
    stop,
    setPointer,
    destroy() {
      stop();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
