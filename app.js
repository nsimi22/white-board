'use strict';

const canvas  = document.getElementById('canvas');
const overlay = document.getElementById('overlay');
const ctx     = canvas.getContext('2d');
const octx    = overlay.getContext('2d');
const textInput = document.getElementById('text-input');

// ── State ──────────────────────────────────────────────────────────────────

let tool     = 'pen';
let color    = '#1a1a2e';
let fillColor = '#ffffff';
let useFill  = false;
let size     = 4;
let opacity  = 1;
let drawing  = false;
let startX   = 0, startY   = 0;
let lastX    = 0, lastY    = 0;

const history = [];  // stack of ImageData snapshots
const redoStack = [];
const MAX_HISTORY = 60;

// ── Resize ─────────────────────────────────────────────────────────────────

function resize() {
  const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width  = overlay.width  = canvas.offsetWidth;
  canvas.height = overlay.height = canvas.offsetHeight;
  ctx.putImageData(snapshot, 0, 0);
}

window.addEventListener('resize', resize);
resize();

// ── History ────────────────────────────────────────────────────────────────

function saveState() {
  if (history.length >= MAX_HISTORY) history.shift();
  history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  redoStack.length = 0;
}

function undo() {
  if (!history.length) return;
  redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  ctx.putImageData(history.pop(), 0, 0);
}

function redo() {
  if (!redoStack.length) return;
  history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  ctx.putImageData(redoStack.pop(), 0, 0);
}

// ── Drawing helpers ────────────────────────────────────────────────────────

function applyStrokeStyle(c) {
  c.globalAlpha   = opacity;
  c.strokeStyle   = color;
  c.fillStyle     = fillColor;
  c.lineWidth     = size;
  c.lineCap       = 'round';
  c.lineJoin      = 'round';
}

function drawShape(c, x0, y0, x1, y1) {
  c.clearRect(0, 0, overlay.width, overlay.height);
  applyStrokeStyle(c);
  c.beginPath();
  if (tool === 'rect') {
    c.rect(x0, y0, x1 - x0, y1 - y0);
  } else if (tool === 'ellipse') {
    const rx = Math.abs(x1 - x0) / 2;
    const ry = Math.abs(y1 - y0) / 2;
    const cx = x0 + (x1 - x0) / 2;
    const cy = y0 + (y1 - y0) / 2;
    c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  } else if (tool === 'line') {
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
  }
  if (useFill && tool !== 'line') c.fill();
  c.stroke();
}

function commitOverlay() {
  ctx.globalAlpha = opacity;
  ctx.drawImage(overlay, 0, 0);
  ctx.globalAlpha = 1;
  octx.clearRect(0, 0, overlay.width, overlay.height);
}

// ── Pointer events ─────────────────────────────────────────────────────────

function getPos(e) {
  const r = overlay.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return [src.clientX - r.left, src.clientY - r.top];
}

overlay.addEventListener('pointerdown', e => {
  if (tool === 'text') { placeTextInput(e); return; }
  drawing = true;
  [startX, startY] = getPos(e);
  [lastX,  lastY]  = [startX, startY];
  overlay.setPointerCapture(e.pointerId);

  if (tool === 'pen' || tool === 'eraser') {
    saveState();
    applyStrokeStyle(ctx);
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.beginPath();
    ctx.moveTo(startX, startY);
  }
});

overlay.addEventListener('pointermove', e => {
  if (!drawing) return;
  const [x, y] = getPos(e);

  if (tool === 'pen' || tool === 'eraser') {
    ctx.lineTo(x, y);
    ctx.stroke();
  } else {
    applyStrokeStyle(octx);
    drawShape(octx, startX, startY, x, y);
  }
  [lastX, lastY] = [x, y];
});

overlay.addEventListener('pointerup', e => {
  if (!drawing) return;
  drawing = false;
  const [x, y] = getPos(e);

  if (tool === 'pen' || tool === 'eraser') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.closePath();
  } else {
    saveState();
    drawShape(octx, startX, startY, x, y);
    commitOverlay();
  }
});

overlay.addEventListener('pointerleave', e => {
  if (drawing && (tool === 'pen' || tool === 'eraser')) {
    ctx.closePath();
  }
});

// ── Text tool ──────────────────────────────────────────────────────────────

function placeTextInput(e) {
  const [x, y] = getPos(e);
  textInput.style.left    = x + 'px';
  textInput.style.top     = y + 'px';
  textInput.style.display = 'block';
  textInput.style.color   = color;
  textInput.style.fontSize = Math.max(12, size * 3) + 'px';
  textInput.value = '';
  textInput.focus();
}

textInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    commitText();
  }
  if (e.key === 'Escape') {
    textInput.style.display = 'none';
  }
});

textInput.addEventListener('blur', () => {
  if (textInput.value.trim()) commitText();
  else textInput.style.display = 'none';
});

function commitText() {
  const text = textInput.value.trim();
  if (!text) { textInput.style.display = 'none'; return; }
  saveState();
  const x = parseFloat(textInput.style.left);
  const y = parseFloat(textInput.style.top);
  const fs = parseInt(textInput.style.fontSize);
  ctx.globalAlpha = opacity;
  ctx.fillStyle   = color;
  ctx.font        = `${fs}px system-ui, sans-serif`;
  const lines = text.split('\n');
  lines.forEach((line, i) => ctx.fillText(line, x, y + fs + i * fs * 1.2));
  ctx.globalAlpha = 1;
  textInput.style.display = 'none';
}

// ── Toolbar wiring ─────────────────────────────────────────────────────────

const toolButtons = {
  'btn-pen':     'pen',
  'btn-eraser':  'eraser',
  'btn-rect':    'rect',
  'btn-ellipse': 'ellipse',
  'btn-line':    'line',
  'btn-text':    'text',
};

Object.entries(toolButtons).forEach(([id, name]) => {
  document.getElementById(id).addEventListener('click', () => setTool(name));
});

function setTool(name) {
  tool = name;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + name).classList.add('active');
  document.body.className = 'tool-' + name;
  if (name !== 'text') { textInput.style.display = 'none'; }
}

document.getElementById('color-picker').addEventListener('input', e => { color = e.target.value; });
document.getElementById('fill-picker').addEventListener('input', e => { fillColor = e.target.value; });
document.getElementById('fill-toggle').addEventListener('change', e => { useFill = e.target.checked; });

const sizeRange    = document.getElementById('size-range');
const sizeDisplay  = document.getElementById('size-display');
sizeRange.addEventListener('input', () => {
  size = +sizeRange.value;
  sizeDisplay.textContent = size;
});

const opacityRange   = document.getElementById('opacity-range');
const opacityDisplay = document.getElementById('opacity-display');
opacityRange.addEventListener('input', () => {
  opacity = opacityRange.value / 100;
  opacityDisplay.textContent = opacityRange.value;
});

document.getElementById('btn-undo').addEventListener('click', undo);
document.getElementById('btn-redo').addEventListener('click', redo);

document.getElementById('btn-clear').addEventListener('click', () => {
  saveState();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById('btn-save').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'whiteboard.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// ── Keyboard shortcuts ─────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.target === textInput) return;
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === 'z') { e.preventDefault(); undo(); }
  if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
  if (!ctrl) {
    const shortcuts = { p: 'pen', e: 'eraser', r: 'rect', o: 'ellipse', l: 'line', t: 'text' };
    if (shortcuts[e.key]) setTool(shortcuts[e.key]);
  }
});
