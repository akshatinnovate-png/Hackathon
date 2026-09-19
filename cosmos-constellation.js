/**
 * The constellation: each task is a star orbiting a "focus core" that glows
 * brighter as more tasks are completed. Renders to a canvas; the accessible
 * equivalent of this picture is the task list, which is always on the page.
 *
 * @typedef {import('./taskModel.js').Task} Task
 */
import { DONE_COLOR, PRIORITIES } from './config.js';
import { clamp } from './utils.js';

const TAU = Math.PI * 2;
const RING_COUNT = 3;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3.2;
const FOCUS_ZOOM = 2.1;
const MAX_PARTICLES = 320;
const DIMMED_ALPHA = 0.14;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{tooltip: HTMLElement, onPick: (id: string|null) => void, reducedMotion: boolean}} options
 */
export function createConstellation(canvas, { tooltip, onPick, reducedMotion }) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { update() {}, zoomBy() {}, resetView() {}, burst() {}, destroy() {} };

  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.25 : 2);
  const FRAME_GAP_MS = 1000 / 30; // orbits are slow; 30 fps looks identical and halves the work
  const nodes = new Map();
  const view = { s: 1, ts: 1, x: 0, y: 0, tx: 0, ty: 0 };
  /** @type {{x:number,y:number,vx:number,vy:number,life:number,color:string}[]} */
  const particles = [];
  /** @type {{id:string,color:string,count:number}[]} */
  let pendingBursts = [];
  let tasks = [];
  let visibleIds = new Set();
  let selectedId = null;
  let hoverId = null;
  let ratio = 0;
  let ratioShown = 0;
  let W = 0;
  let H = 0;
  let raf = 0;
  let inView = true;
  let last = 0;
  const t0 = performance.now();
  /** @type {Map<string, HTMLCanvasElement>} */
  const halos = new Map();
  const label = Object.assign(document.createElement('canvas'), { key: '', logicalW: 0, logicalH: 0 });
  const displayFont = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'serif';

  /* ---------- data ---------- */

  /** @param {{tasks: Task[], visibleIds: Set<string>, selectedId: string|null}} data */
  function update(data) {
    tasks = data.tasks;
    visibleIds = data.visibleIds;
    const previousSelected = selectedId;
    selectedId = data.selectedId;

    const live = new Set();
    const perRing = new Array(RING_COUNT).fill(0);
    tasks.forEach((task, i) => {
      live.add(task.id);
      let node = nodes.get(task.id);
      if (!node) {
        node = { id: task.id, alpha: 0, bx: 0, by: 0, sx: 0, sy: 0, positioned: false, angle: 0 };
        nodes.set(task.id, node);
      }
      node.ring = i % RING_COUNT;
      node.done = task.done;
      node.title = task.title;
      node.priority = task.priority;
      node.color = task.done ? DONE_COLOR : PRIORITIES[task.priority].color;
      node.target = visibleIds.has(task.id) ? 1 : DIMMED_ALPHA;
      node.radius = PRIORITIES[task.priority].radius * (task.done ? 0.72 : 1);
      perRing[node.ring] += 1;
    });
    nodes.forEach((_, id) => { if (!live.has(id)) nodes.delete(id); });
    const seen = new Array(RING_COUNT).fill(0);
    tasks.forEach((task) => {
      const node = nodes.get(task.id);
      node.slot = seen[node.ring] / Math.max(1, perRing[node.ring]);
      seen[node.ring] += 1;
    });

    ratio = tasks.length ? tasks.filter((t) => t.done).length / tasks.length : 0;
    if (selectedId && selectedId !== previousSelected) focusNode(selectedId);
    invalidate();
  }

  function emit(node, color, count) {
    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * TAU;
      const speed = 0.4 + Math.random() * 2.2;
      particles.push({ x: node.bx, y: node.by, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color });
    }
  }

  /**
   * Emits particles from a task's star. If the star has not been drawn yet
   * (a brand-new task) the burst waits for its first frame.
   */
  function burst(id, color, count = 26) {
    if (reducedMotion) return;
    const node = nodes.get(id);
    if (node && node.positioned) emit(node, color, count);
    else pendingBursts.push({ id, color, count });
    invalidate();
  }

  function flushBursts() {
    const waiting = [];
    for (const b of pendingBursts) {
      const node = nodes.get(b.id);
      if (!node) continue;
      if (node.positioned) emit(node, b.color, b.count);
      else waiting.push(b);
    }
    pendingBursts = waiting;
  }

  /* ---------- view ---------- */

  function setView(scale, x, y) {
    view.ts = scale;
    view.tx = x;
    view.ty = y;
    invalidate();
  }

  function focusNode(id) {
    const node = nodes.get(id);
    if (!node || !node.positioned) return;
    setView(FOCUS_ZOOM, (W / 2 - node.bx) * FOCUS_ZOOM, (H / 2 - node.by) * FOCUS_ZOOM);
  }

  /** @param {number} factor */
  function zoomBy(factor) {
    const s = clamp(view.ts * factor, MIN_ZOOM, MAX_ZOOM);
    if (s <= 1.02) setView(s, 0, 0);
    else setView(s, view.tx, view.ty);
  }

  const resetView = () => setView(1, 0, 0);

  /* ---------- input ---------- */

  function hitTest(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best = null;
    let bestDist = 22 * 22;
    nodes.forEach((n) => {
      const d = (mx - n.sx) ** 2 + (my - n.sy) ** 2;
      if (d < bestDist) { bestDist = d; best = n; }
    });
    return best;
  }

  function onMove(e) {
    const node = hitTest(e);
    const id = node ? node.id : null;
    if (id === hoverId) return;
    hoverId = id;
    canvas.style.cursor = node ? 'pointer' : 'crosshair';
    if (node) {
      tooltip.hidden = false;
      tooltip.style.left = `${node.sx}px`;
      tooltip.style.top = `${node.sy}px`;
      tooltip.textContent = `${node.title} · ${PRIORITIES[node.priority].label} priority · ${node.done ? 'complete' : 'pending'}`;
    } else {
      tooltip.hidden = true;
    }
    invalidate();
  }

  function onLeave() {
    hoverId = null;
    tooltip.hidden = true;
    invalidate();
  }

  function onClick(e) {
    const node = hitTest(e);
    if (node) onPick(node.id);
    else { onPick(null); resetView(); }
  }

  /** Zoom only with Ctrl/Cmd + wheel so normal page scrolling is never trapped. */
  function onWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.12 : 0.9);
  }

  /* ---------- drawing ---------- */

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    if (selectedId) focusNode(selectedId);
    invalidate();
  }

  function draw(now, dt) {
    const t = (now - t0) / 1000;
    if (selectedId && view.ts === FOCUS_ZOOM && !reducedMotion) {
      const followed = nodes.get(selectedId); // keep the chosen star centred as it orbits
      if (followed?.positioned) {
        view.tx = (W / 2 - followed.bx) * FOCUS_ZOOM;
        view.ty = (H / 2 - followed.by) * FOCUS_ZOOM;
      }
    }
    const ease = reducedMotion ? 1 : 0.12;
    view.s += (view.ts - view.s) * ease;
    view.x += (view.tx - view.x) * ease;
    view.y += (view.ty - view.y) * ease;
    ratioShown += (ratio - ratioShown) * (reducedMotion ? 1 : 0.08);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.translate(W / 2 + view.x, H / 2 + view.y);
    ctx.scale(view.s, view.s);
    ctx.translate(-W / 2, -H / 2);

    const cx = W / 2;
    const cy = H / 2;
    const base = Math.min(W, H);

    for (let r = 0; r < RING_COUNT; r++) {
      ctx.beginPath();
      ctx.arc(cx, cy, base * (0.22 + r * 0.11), 0, TAU);
      ctx.strokeStyle = `rgba(245,234,216,${0.14 - r * 0.03})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    drawCore(cx, cy, base, t);

    nodes.forEach((n) => {
      const orbit = base * (0.235 + n.ring * 0.11);
      const direction = n.ring % 2 ? -1 : 1;
      const speed = reducedMotion ? 0 : 0.09 * direction * (n.done ? 0.4 : 1);
      n.angle = n.slot * TAU + t * speed + n.ring * 0.7;
      n.bx = cx + Math.cos(n.angle) * orbit;
      n.by = cy + Math.sin(n.angle) * orbit * 0.62;
      n.sx = (n.bx - cx) * view.s + cx + view.x;
      n.sy = (n.by - cy) * view.s + cy + view.y;
      n.positioned = true;
      n.alpha += (n.target - n.alpha) * (reducedMotion ? 1 : 0.12);
      drawStar(n, t);
    });

    flushBursts();
    drawParticles(dt);
  }

  function drawCore(cx, cy, base, t) {
    const energy = 0.6 + 0.4 * ratioShown;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(t * (1.1 + ratioShown)) * 0.05 * energy;
    const coreR = base * 0.115 * pulse;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.6);
    glow.addColorStop(0, `rgba(255,220,170,${0.55 + 0.35 * ratioShown})`);
    glow.addColorStop(0.28, `rgba(224,138,60,${0.4 + 0.25 * ratioShown})`);
    glow.addColorStop(0.62, 'rgba(150,80,140,0.14)');
    glow.addColorStop(1, 'rgba(120,70,160,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 2.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(255,238,214,${0.5 + 0.4 * ratioShown})`;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 0.6, 0, TAU);
    ctx.fill();

    drawCoreLabel(cx, cy, base);

    const arcR = base * 0.17;
    ctx.lineWidth = Math.max(3, base * 0.014);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, arcR, 0, TAU);
    ctx.strokeStyle = 'rgba(245,234,216,0.16)';
    ctx.stroke();
    if (ratioShown > 0.001) {
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, -Math.PI / 2, -Math.PI / 2 + TAU * ratioShown);
      ctx.strokeStyle = '#aebf92';
      ctx.stroke();
    }
  }

  /** The label is rendered once per value into an offscreen canvas (shadows are costly to redraw every frame). */
  function labelSprite(percent, done, total, base) {
    const key = `${percent}|${done}|${total}|${Math.round(base)}`;
    if (label.key === key) return label;
    const big = Math.max(24, base * 0.085);
    const small = Math.max(11, base * 0.026);
    const w = Math.ceil(big * 4);
    const h = Math.ceil(big * 2);
    label.width = w * dpr;
    label.height = h * dpr;
    const g = label.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(7,6,11,0.95)';
    g.shadowBlur = 10;
    g.fillStyle = '#f5ead8';
    g.font = `700 ${big}px ${displayFont}`;
    g.fillText(`${percent}%`, w / 2, h / 2 - small * 0.4);
    g.font = `${small}px system-ui, sans-serif`;
    g.fillText(`${done} of ${total} complete`, w / 2, h / 2 + big * 0.55);
    label.key = key;
    label.logicalW = w;
    label.logicalH = h;
    return label;
  }

  /** The completion figure is drawn inside the canvas so it zooms with the core it describes. */
  function drawCoreLabel(cx, cy, base) {
    const done = tasks.reduce((n, t) => n + (t.done ? 1 : 0), 0);
    const sprite = labelSprite(Math.round(ratioShown * 100), done, tasks.length, base);
    ctx.drawImage(sprite, cx - sprite.logicalW / 2, cy - sprite.logicalH / 2, sprite.logicalW, sprite.logicalH);
  }

  /** A soft glow rendered once per colour and reused, instead of building a gradient per star per frame. */
  function haloSprite(color) {
    let sprite = halos.get(color);
    if (!sprite) {
      const size = 64;
      sprite = document.createElement('canvas');
      sprite.width = size;
      sprite.height = size;
      const g = sprite.getContext('2d');
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, color);
      grad.addColorStop(0.25, `${color}66`);
      grad.addColorStop(1, `${color}00`);
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      halos.set(color, sprite);
    }
    return sprite;
  }

  function drawStar(n, t) {
    const selected = selectedId === n.id;
    const r = n.radius * (selected ? 1.7 : hoverId === n.id ? 1.35 : 1);
    ctx.globalAlpha = n.alpha;
    ctx.drawImage(haloSprite(n.color), n.bx - r * 4, n.by - r * 4, r * 8, r * 8);
    ctx.fillStyle = n.done ? 'rgba(200,214,176,.85)' : '#fff6e8';
    ctx.beginPath();
    ctx.arc(n.bx, n.by, r * 0.5, 0, TAU);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(n.bx, n.by, r * 2.2 + (reducedMotion ? 0 : Math.sin(t * 3) * 2), 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt * 1.4;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- loop ---------- */

  /** Are there still animations in flight that need more frames? */
  function isSettled() {
    if (particles.length || pendingBursts.length) return false;
    if (Math.abs(view.ts - view.s) > 0.001 || Math.abs(view.tx - view.x) > 0.3 || Math.abs(view.ty - view.y) > 0.3) return false;
    if (Math.abs(ratio - ratioShown) > 0.002) return false;
    for (const n of nodes.values()) if (Math.abs(n.target - n.alpha) > 0.01) return false;
    return true;
  }

  function frame(now) {
    raf = 0;
    if (!reducedMotion && last && now - last < FRAME_GAP_MS - 2) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    draw(now, dt);
    if ((!reducedMotion || !isSettled()) && inView && !document.hidden) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  /** Schedules a draw if one is not already pending. */
  function invalidate() {
    if (!raf && inView && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) invalidate();
  });
  visibilityObserver.observe(canvas);
  const onVisibility = () => { if (!document.hidden) invalidate(); };
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  resize();

  return {
    update,
    zoomBy,
    resetView,
    burst,
    destroy() {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('wheel', onWheel);
    },
  };
}
