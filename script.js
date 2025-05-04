// Advanced Snake Game Script

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const speedSelect = document.getElementById('speedSelect');
const gridToggleBtn = document.getElementById('gridToggleBtn');
const gameOverScreen = document.getElementById('gameOverScreen');

const soundEat = document.getElementById('soundEat');
const soundGameOver = document.getElementById('soundGameOver');
const soundPause = document.getElementById('soundPause');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [];
let velocity = { x: 0, y: 0 };
let food = {};
let foodType = 'normal'; // normal, bonus, speed
let score = 0;
let highScore = 0;
let speed = 8; // tiles per second, default medium
let lastFrameTime = 0;
let gameRunning = false;
let gamePaused = false;
let moveQueue = []; // queue to buffer quick direction changes
let gridVisible = false;

// For mobile swipe detection
let touchStartX = 0;
let touchStartY = 0;
const swipeThreshold = 30; // minimum px to be considered swipe

// Food types and their effects
const foodTypes = {
  normal: {
    color1: '#ff3d3d',
    color2: '#a80000',
    score: 1,
    speedChange: 0,
  },
  bonus: {
    color1: '#ffd93d',
    color2: '#b38f00',
    score: 3,
    speedChange: 0,
  },
  speed: {
    color1: '#3dffea',
    color2: '#008f8f',
    score: 1,
    speedChange: 1, // increase speed by 1
  },
};

function loadHighScore() {
  const stored = localStorage.getItem('snakeHighScore');
  highScore = stored ? parseInt(stored) : 0;
  highScoreEl.textContent = highScore;
}

function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('snakeHighScore', highScore);
    highScoreEl.textContent = highScore;
  }
}

function init() {
  snake = [
    { x: 9, y: 9 },
    { x: 8, y: 9 },
    { x: 7, y: 9 },
  ];
  velocity = { x: 1, y: 0 };
  score = 0;
  updateScore();
  placeFood();
  speed = parseInt(speedSelect.value);
  lastFrameTime = 0;
  gameRunning = true;
  gamePaused = false;
  moveQueue = [];
  pauseBtn.disabled = false;
  pauseBtn.textContent = 'Pause';
  gameOverScreen.classList.add('hidden');
  startBtn.disabled = true;
  draw(); // initial draw
  requestAnimationFrame(gameLoop);
}

function placeFood() {
  // Randomly assign food type with weighted chance
  const rand = Math.random();
  if (rand < 0.7) foodType = 'normal';
  else if (rand < 0.9) foodType = 'bonus';
  else foodType = 'speed';

  while (true) {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
    if (!snake.some(s => s.x === food.x && s.y === food.y)) break;
  }
}

function updateScore() {
  scoreEl.textContent = score;
}

function gameLoop(timestamp) {
  if (!gameRunning) return;

  if (gamePaused) {
    lastFrameTime = timestamp;
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!lastFrameTime) lastFrameTime = timestamp;
  const secondsSinceLastFrame = (timestamp - lastFrameTime) / 1000;

  const secondsPerMove = 1 / speed;

  if (secondsSinceLastFrame > secondsPerMove) {
    lastFrameTime = timestamp;
    update();
    draw();
  }

  requestAnimationFrame(gameLoop);
}

function update() {
  // Process queued moves if any
  if (moveQueue.length) {
    const nextVelocity = moveQueue.shift();
    if (!isOppositeDirection(nextVelocity, velocity)) {
      velocity = nextVelocity;
    }
  }

  const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

  // Wrap edges
  if (head.x < 0) head.x = tileCount - 1;
  else if (head.x >= tileCount) head.x = 0;
  if (head.y < 0) head.y = tileCount - 1;
  else if (head.y >= tileCount) head.y = 0;

  // Check self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);

  // Check food eaten
  if (head.x === food.x && head.y === food.y) {
    playSound(soundEat);
    score += foodTypes[foodType].score;
    updateScore();

    // Speed change effect
    if (foodTypes[foodType].speedChange !== 0) {
      speed += foodTypes[foodType].speedChange;
      speed = Math.min(Math.max(speed, 5), 25); // clamp speed 5-25
      speedSelect.value = speed;
    }

    placeFood();
  } else {
    snake.pop();
  }

  // Dynamic speed increase every 5 points
  if (score > 0 && score % 5 === 0) {
    speed = Math.min(25, speed + 0.01); // smooth speed increase
  }
}

function draw() {
  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw grid if enabled
  if (gridVisible) {
    drawGrid();
  }

  // Draw food
  drawFood();

  // Draw snake with gradient and rounded corners
  drawSnake();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(0, 255, 234, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= tileCount; i++) {
    // vertical lines
    ctx.beginPath();
    ctx.moveTo(i * gridSize + 0.5, 0);
    ctx.lineTo(i * gridSize + 0.5, canvas.height);
    ctx.stroke();

    // horizontal lines
    ctx.beginPath();
    ctx.moveTo(0, i * gridSize + 0.5);
    ctx.lineTo(canvas.width, i * gridSize + 0.5);
    ctx.stroke();
  }
}

function drawSnake() {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00fff0';

  // Gradient for snake body
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#00ffea');
  gradient.addColorStop(1, '#00a3a3');

  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#00fff0';
  ctx.lineWidth = 6;

  snake.forEach((segment, i) => {
    const x = segment.x * gridSize;
    const y = segment.y * gridSize;

    // Draw rounded rect for segment
    roundRect(ctx, x + 3, y + 3, gridSize - 6, gridSize - 6, 6, true, true);

    // Head special style
    if (i === 0) {
      ctx.shadowColor = '#00fff0';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#00fff0';
      roundRect(ctx, x + 3, y + 3, gridSize - 6, gridSize - 6, 8, true, true);
      ctx.shadowBlur = 15;
      ctx.fillStyle = gradient;
    }
  });

  ctx.shadowBlur = 0;
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (let side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawFood() {
  const centerX = food.x * gridSize + gridSize / 2;
  const centerY = food.y * gridSize + gridSize / 2;
  const radius = gridSize / 2 - 4;

  const colors = foodTypes[foodType];
  const gradient = ctx.createRadialGradient(centerX, centerY, radius / 4, centerX, centerY, radius);
  gradient.addColorStop(0, colors.color1);
  gradient.addColorStop(1, colors.color2);

  ctx.fillStyle = gradient;
  ctx.shadowColor = colors.color1;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function isOppositeDirection(dir1, dir2) {
  return dir1.x === -dir2.x && dir1.y === -dir2.y;
}

function changeDirection(e) {
  if (!gameRunning || gamePaused) return;

  const key = e.key.toLowerCase();

  const dirMap = {
    arrowup: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
  };

  if (dirMap[key]) {
    const newDir = dirMap[key];
    // Buffer direction changes to avoid skipping
    if (moveQueue.length === 0) {
      if (!isOppositeDirection(newDir, velocity)) {
        moveQueue.push(newDir);
      }
    } else {
      // Only add if not opposite to last queued direction
      const lastDir = moveQueue[moveQueue.length - 1];
      if (!isOppositeDirection(newDir, lastDir)) {
        moveQueue.push(newDir);
      }
    }
  }
}

function togglePause() {
  if (!gameRunning) return;

  gamePaused = !gamePaused;
  pauseBtn.textContent = gamePaused ? 'Resume' : 'Pause';
  playSound(soundPause);
}

function gameOver() {
  gameRunning = false;
  saveHighScore();
  finalScoreEl.textContent = score;
  gameOverScreen.classList.remove('hidden');
  pauseBtn.disabled = true;
  startBtn.disabled = false;
  playSound(soundGameOver);
}

function playSound(sound) {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function toggleGrid() {
  gridVisible = !gridVisible;
  if (gridVisible) {
    canvas.parentElement.classList.add('show-grid');
  } else {
    canvas.parentElement.classList.remove('show-grid');
  }
  draw();
}

// Mobile swipe detection
function handleTouchStart(e) {
  if (!gameRunning || gamePaused) return;
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchMove(e) {
  if (!gameRunning || gamePaused) return;
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (Math.abs(dx) > swipeThreshold || Math.abs(dy) > swipeThreshold) {
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (dx > 0) queueDirection({ x: 1, y: 0 });
      else queueDirection({ x: -1, y: 0 });
    } else {
      // Vertical swipe
      if (dy > 0) queueDirection({ x: 0, y: 1 });
      else queueDirection({ x: 0, y: -1 });
    }
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }
}

function queueDirection(newDir) {
  if (moveQueue.length === 0) {
    if (!isOppositeDirection(newDir, velocity)) {
      moveQueue.push(newDir);
    }
  } else {
    const lastDir = moveQueue[moveQueue.length - 1];
    if (!isOppositeDirection(newDir, lastDir)) {
      moveQueue.push(newDir);
    }
  }
}

// Event listeners
startBtn.addEventListener('click', () => {
  init();
});

pauseBtn.addEventListener('click', () => {
  togglePause();
});

restartBtn.addEventListener('click', () => {
  init();
  gameOverScreen.classList.add('hidden');
});

speedSelect.addEventListener('change', () => {
  if (!gameRunning) return;
  speed = parseInt(speedSelect.value);
});

gridToggleBtn.addEventListener('click', () => {
  toggleGrid();
});

window.addEventListener('keydown', changeDirection);

canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
canvas.addEventListener('touchmove', handleTouchMove, { passive: true });

// Initialize high score on load
loadHighScore();
