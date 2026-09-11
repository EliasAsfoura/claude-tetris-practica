'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - pale blue
  '#ffb74d', // L - orange
  '#f8bbd0', // + (plus) - pink
  '#a1887f', // U - brown
  '#26a69a', // Y - teal
  '#ffee58', // single (1x1) - bright gold, tetris reward
  '#90a4ae', // 3x3 hollow - grey
];

const GRID_COLORS = { dark: '#22222e', light: '#d8dae6' };

// --- Skins ---------------------------------------------------------------
// Every skin owns the full look of the canvas:
//   colors          array of 13 entries (index 0 = empty, indices 1..12 = pieces)
//   gridColor       a CSS color string, or { dark, light } to follow the
//                   light/dark theme (only `retro` does, to keep the original
//                   behaviour of the theme toggle)
//   boardBackground optional color painted on the canvas before the grid
//   drawBlock       same signature as the global drawBlock() wrapper
// Skins are interchangeable: the global drawBlock() just delegates here.

// Draws a simple deterministic pixel-art texture over a block.
function drawPixelTexture(context, px, py, inner) {
  const cell = inner / 4;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tone = (r + c) % 3;
      if (tone === 0) context.fillStyle = 'rgba(255,255,255,0.22)';
      else if (tone === 1) continue;
      else context.fillStyle = 'rgba(0,0,0,0.22)';
      context.fillRect(px + c * cell, py + r * cell, cell, cell);
    }
  }
}

const SKINS = {
  retro: {
    label: 'Retro',
    colors: COLORS,
    gridColor: GRID_COLORS,
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const px = x * size + 1;
      const py = y * size + 1;
      const inner = size - 2;
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = this.colors[colorIndex];
      context.fillRect(px, py, inner, inner);
      // highlight
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px, py, inner, 4);
      context.globalAlpha = 1;
    },
  },

  neon: {
    label: 'Neón',
    colors: [
      null,
      '#00e5ff', // I
      '#ffea00', // O
      '#c04bff', // T
      '#39ff14', // S
      '#ff1744', // Z
      '#2979ff', // J
      '#ff9100', // L
      '#ff4fd8', // +
      '#ff6e40', // U
      '#00ffc8', // Y
      '#fff566', // single
      '#b0f0ff', // 3x3 hollow
    ],
    gridColor: '#16202c',
    boardBackground: '#05060a',
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const color = this.colors[colorIndex];
      const px = x * size + 2;
      const py = y * size + 2;
      const inner = size - 4;
      context.globalAlpha = alpha ?? 1;
      context.shadowColor = color;
      context.shadowBlur = size * 0.45;
      context.fillStyle = color;
      context.globalAlpha = (alpha ?? 1) * 0.25;
      context.fillRect(px, py, inner, inner);
      context.globalAlpha = alpha ?? 1;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px, py, inner, inner);
      // reset so the glow does not leak into the grid or other blocks
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      context.lineWidth = 1;
      context.globalAlpha = 1;
    },
  },

  pastel: {
    label: 'Pastel',
    colors: [
      null,
      '#a8e6ef', // I
      '#ffe7a8', // O
      '#d8bfe8', // T
      '#b8e6c0', // S
      '#f4b0b0', // Z
      '#b8d4f4', // J
      '#ffd2a8', // L
      '#f8d6e4', // +
      '#ddc9bd', // U
      '#a8ded4', // Y
      '#fff3b0', // single
      '#cfd8dc', // 3x3 hollow
    ],
    gridColor: '#cbd2e0',
    boardBackground: '#fdfbff',
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const px = x * size + 2;
      const py = y * size + 2;
      const inner = size - 4;
      const radius = Math.min(inner / 2, size * 0.28);
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = this.colors[colorIndex];
      if (typeof context.roundRect === 'function') {
        context.beginPath();
        context.roundRect(px, py, inner, inner, radius);
        context.fill();
        context.fillStyle = 'rgba(255,255,255,0.45)';
        context.beginPath();
        context.roundRect(px + radius * 0.5, py + radius * 0.5, inner - radius, inner * 0.28, radius * 0.6);
        context.fill();
      } else {
        context.fillRect(px, py, inner, inner);
        context.fillStyle = 'rgba(255,255,255,0.45)';
        context.fillRect(px + 2, py + 2, inner - 4, inner * 0.28);
      }
      context.globalAlpha = 1;
    },
  },

  pixel: {
    label: 'Pixel art',
    colors: [
      null,
      '#00b8d4', // I
      '#ffc400', // O
      '#aa00ff', // T
      '#00c853', // S
      '#d50000', // Z
      '#2962ff', // J
      '#ff6d00', // L
      '#ff4081', // +
      '#8d6e63', // U
      '#00897b', // Y
      '#ffd600', // single
      '#607d8b', // 3x3 hollow
    ],
    gridColor: '#2b2b38',
    boardBackground: '#101018',
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const px = x * size + 1;
      const py = y * size + 1;
      const inner = size - 2;
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = this.colors[colorIndex];
      context.fillRect(px, py, inner, inner);
      drawPixelTexture(context, px, py, inner);
      context.strokeStyle = 'rgba(0,0,0,0.45)';
      context.lineWidth = 1;
      context.strokeRect(px + 0.5, py + 0.5, inner - 1, inner - 1);
      context.globalAlpha = 1;
    },
  },
};

const DEFAULT_SKIN = 'retro';
const SKIN_KEY = 'tetris-skin';

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[0,8,0],[8,8,8],[0,8,0]],                  // + (plus) pentomino
  [[9,0,9],[9,9,9]],                          // U pentomino
  [[0,10,0,0],[10,10,10,10]],                 // Y pentomino
  [[11]],                                      // single (1x1), tetris reward
  [[12,12,12],[12,0,12],[12,12,12]],          // 3x3 hollow square (special)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

// --- Special pieces configuration ---------------------------------------
// Tuning knobs for how often non-standard pieces appear. Standard
// tetrominoes (types 1-7) are picked the rest of the time.
const SPECIAL_PIECE_TYPES = { plus: 8, u: 9, y: 10, square3x3: 12 };
const TETRIS_REWARD_TYPE = 11; // single 1x1 block, awarded after a Tetris

const SPECIAL_PIECE_CONFIG = {
  // Probability that a newly generated piece is a special piece instead
  // of a standard tetromino (does not apply to the Tetris reward piece).
  chance: 0.15,
  // Relative weights used to pick among the special pieces once the
  // chance above triggers. Higher = more frequent. square3x3 is kept
  // rare since it's a bigger challenge piece.
  weights: { plus: 35, u: 35, y: 25, square3x3: 5 },
};

// Set to the reward type right after a Tetris; consumed by the next
// piece generated, then cleared so normal generation resumes.
let pendingRewardType = null;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');

const THEME_KEY = 'tetris-theme';

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let currentSkin = SKINS[DEFAULT_SKIN];
let currentTheme = 'dark';
let gridColor = GRID_COLORS.dark;

// Grid color comes from the active skin; skins may declare a single color or
// { dark, light } variants to follow the light/dark theme.
function resolveGridColor() {
  const g = currentSkin.gridColor;
  if (typeof g === 'string') return g;
  return currentTheme === 'light' ? g.light : g.dark;
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    if (r < w) return key;
    r -= w;
  }
  return entries[entries.length - 1][0];
}

function pickPieceType() {
  if (pendingRewardType) {
    const type = pendingRewardType;
    pendingRewardType = null;
    return type;
  }
  if (Math.random() < SPECIAL_PIECE_CONFIG.chance) {
    const name = weightedRandom(SPECIAL_PIECE_CONFIG.weights);
    return SPECIAL_PIECE_TYPES[name];
  }
  return Math.floor(Math.random() * 7) + 1;
}

function randomPiece() {
  const type = pickPieceType();
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (cleared === 4) pendingRewardType = TETRIS_REWARD_TYPE; // Tetris reward: next piece is the 1x1
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

// --- Skins DOM ---
const skinSelect = document.getElementById('skin-select');

// Thin wrapper: every block on every canvas is rendered by the active skin.
function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  currentSkin.drawBlock(context, x, y, colorIndex, size, alpha);
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (currentSkin.boardBackground) {
    ctx.fillStyle = currentSkin.boardBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  if (!gameOver) {
    // ghost
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

    // current piece
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  }
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (currentSkin.boardBackground) {
    nextCtx.fillStyle = currentSkin.boardBackground;
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  }
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  animId = null;
  draw();
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  cancelAnimationFrame(animId);
  animId = null;
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  pendingRewardType = null;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  // Let form controls (skin select, theme toggle, restart button) keep their
  // own keyboard behaviour instead of driving the game.
  if (e.target && typeof e.target.closest === 'function' && e.target.closest('select, input, button')) return;
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  themeToggle.checked = theme === 'light';
  currentTheme = theme;
  gridColor = resolveGridColor();
  localStorage.setItem(THEME_KEY, theme);
  repaint();
}

themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'light' : 'dark');
});

// The game loop stops itself while paused or on game over, so any visual
// change has to repaint both canvases explicitly.
function repaint() {
  if (!board || !current || !next) return;
  draw();
  drawNext();
}

function applySkin(name) {
  const skinName = SKINS[name] ? name : DEFAULT_SKIN;
  currentSkin = SKINS[skinName];
  skinSelect.value = skinName;
  document.body.dataset.skin = skinName;
  gridColor = resolveGridColor();
  localStorage.setItem(SKIN_KEY, skinName);
  repaint();
}

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  skinSelect.blur(); // give keyboard control back to the game
});

applySkin(localStorage.getItem(SKIN_KEY) || DEFAULT_SKIN);
applyTheme(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');

init();
