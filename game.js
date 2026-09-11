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

const GRID_COLORS = { dark: '#22222e', light: '#d8dae6' };
const THEME_KEY = 'tetris-theme';

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
// Consecutive line-clearing locks, and the best streak of the current game.
let combo = 0, maxCombo = 0;
// The game no longer boots on load: it waits for the start screen's play button.
let started = false;
let gridColor = GRID_COLORS.dark;

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
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    if (cleared === 4) pendingRewardType = TETRIS_REWARD_TYPE; // Tetris reward: next piece is the 1x1
    updateHUD();
  }
  return cleared;
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
  // A lock that clears nothing breaks the combo streak.
  if (!clearLines()) combo = 0;
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

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
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
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

// --- Highscores DOM ---
const startScreen = document.getElementById('start-screen');
const startHighscores = document.getElementById('start-highscores');
const startBests = document.getElementById('start-bests');
const startBtn = document.getElementById('start-btn');
const resetScoresBtn = document.getElementById('reset-scores-btn');
const overlayResetBtn = document.getElementById('overlay-reset-btn');
const highscoresList = document.getElementById('highscores-list');
const overlayBests = document.getElementById('overlay-bests');
const highscoreForm = document.getElementById('highscore-form');
const highscoreName = document.getElementById('highscore-name');
const highscoreSaveBtn = document.getElementById('highscore-save');

// --- Highscores ---
const HIGHSCORES_KEY = 'tetris-highscores';
const MAX_HIGHSCORES = 5;
const MAX_NAME_LENGTH = 12;
const DEFAULT_NAME = 'Anónimo';

// Finished game waiting for the player to type a name, or null.
let pendingEntry = null;

function toCount(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

// Stored JSON can be corrupt or written by an older version, so every field
// is validated instead of trusted. Any failure falls back to an empty table.
function loadHighscores() {
  let raw;
  try {
    raw = JSON.parse(localStorage.getItem(HIGHSCORES_KEY));
  } catch (e) {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(e => e && typeof e === 'object')
    .map(e => ({
      name: String(e.name ?? DEFAULT_NAME).slice(0, MAX_NAME_LENGTH) || DEFAULT_NAME,
      score: toCount(e.score, 0),
      lines: toCount(e.lines, 0),
      level: toCount(e.level, 1),
      combo: toCount(e.combo, 0),
      date: typeof e.date === 'string' ? e.date : '',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGHSCORES);
}

function saveHighscores(list) {
  try {
    localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(list));
  } catch (e) {
    // Private mode or quota exceeded: the table just stays in memory.
  }
}

function qualifiesForTop(value, list) {
  return value > 0 && (list.length < MAX_HIGHSCORES || value > list[MAX_HIGHSCORES - 1].score);
}

function highscoreRow(entry, rank, isNew) {
  const li = document.createElement('li');
  li.className = isNew ? 'hs-row is-new' : 'hs-row';
  const cells = [
    ['hs-rank', `${rank}.`],
    ['hs-name', entry.name],
    ['hs-score', entry.score.toLocaleString()],
    ['hs-detail', `${entry.lines} L`],
    ['hs-detail', `x${entry.combo}`],
  ];
  for (const [className, text] of cells) {
    const span = document.createElement('span');
    span.className = className;
    // textContent, never innerHTML: the name is player input.
    span.textContent = text;
    li.appendChild(span);
  }
  return li;
}

function renderHighscores(listEl, entries, highlightIndex) {
  listEl.textContent = '';
  if (!entries.length) {
    const li = document.createElement('li');
    li.className = 'hs-empty';
    li.textContent = 'Aún no hay records';
    listEl.appendChild(li);
    return;
  }
  entries.forEach((entry, i) => {
    listEl.appendChild(highscoreRow(entry, i + 1, i === highlightIndex));
  });
}

// Bests are derived from the stored table, so they describe the top 5 and not
// every game ever played. The label says so to stay honest: an entry pushed
// out of the table takes its combo and lines with it.
function renderBests(el, entries) {
  if (!entries.length) {
    el.textContent = 'Mejor combo del top: — · Líneas máximas del top: —';
    return;
  }
  const bestCombo = entries.reduce((max, e) => Math.max(max, e.combo), 0);
  const bestLines = entries.reduce((max, e) => Math.max(max, e.lines), 0);
  el.textContent = `Mejor combo del top: x${bestCombo} · Líneas máximas del top: ${bestLines}`;
}

function renderStartScreen() {
  const entries = loadHighscores();
  renderHighscores(startHighscores, entries, -1);
  renderBests(startBests, entries);
}

// Clears anything left over from a previous game over, so the PAUSA overlay
// (which reuses #overlay) never shows a stale table.
function resetHighscoreOverlay() {
  pendingEntry = null;
  highscoreForm.classList.add('hidden');
  overlayResetBtn.classList.add('hidden');
  highscoresList.textContent = '';
  overlayBests.textContent = '';
}

function maybeSaveHighscore() {
  const entries = loadHighscores();
  pendingEntry = { score, lines, level, combo: maxCombo, date: new Date().toISOString() };
  renderHighscores(highscoresList, entries, -1);
  renderBests(overlayBests, entries);
  overlayResetBtn.classList.remove('hidden');
  if (qualifiesForTop(score, entries)) {
    highscoreName.value = '';
    highscoreForm.classList.remove('hidden');
    highscoreName.focus();
  } else {
    pendingEntry = null;
    highscoreForm.classList.add('hidden');
  }
}

function saveHighscoreEntry() {
  if (!pendingEntry) return;
  const name = highscoreName.value.trim().slice(0, MAX_NAME_LENGTH) || DEFAULT_NAME;
  const entry = { ...pendingEntry, name };
  pendingEntry = null;
  highscoreForm.classList.add('hidden');
  // Reload first so a table saved from another tab is not overwritten. That
  // also means the score may no longer qualify, in which case nothing is
  // written and the player just sees the current table.
  const entries = loadHighscores();
  if (!qualifiesForTop(entry.score, entries)) {
    renderHighscores(highscoresList, entries, -1);
    renderBests(overlayBests, entries);
    return;
  }
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  const top = entries.slice(0, MAX_HIGHSCORES);
  saveHighscores(top);
  renderHighscores(highscoresList, top, top.indexOf(entry));
  renderBests(overlayBests, top);
  renderStartScreen();
}

function resetHighscores() {
  if (!confirm('¿Seguro que quieres borrar todos los records?')) return;
  try {
    localStorage.removeItem(HIGHSCORES_KEY);
  } catch (e) {
    // Nothing to do: the table is rendered from storage anyway.
  }
  renderStartScreen();
  if (!overlay.classList.contains('hidden')) {
    renderHighscores(highscoresList, [], -1);
    renderBests(overlayBests, []);
  }
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  animId = null;
  draw();
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
  // After unhiding: focusing the name field only works once it's displayed.
  maybeSaveHighscore();
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
  combo = 0;
  maxCombo = 0;
  started = true;
  resetHighscoreOverlay();
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  // Typing the highscore name must not drive the game. Matched by identity:
  // #theme-toggle is an <input> too and stays focused after being clicked.
  if (e.target === highscoreName) return;
  // Before the first game there is no piece or board to act on.
  if (!started) return;
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
  gridColor = theme === 'light' ? GRID_COLORS.light : GRID_COLORS.dark;
  localStorage.setItem(THEME_KEY, theme);
}

themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'light' : 'dark');
});

applyTheme(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');

startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  init();
});

resetScoresBtn.addEventListener('click', resetHighscores);
overlayResetBtn.addEventListener('click', resetHighscores);
highscoreSaveBtn.addEventListener('click', saveHighscoreEntry);
highscoreName.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveHighscoreEntry();
  }
});

// The game starts from the start screen, not on load.
renderStartScreen();
