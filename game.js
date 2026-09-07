// ---- Grid setuppp ----
const COLS = 21;
const ROWS = 15;

// 1 = wall, 0 = floor
const map = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,1,0,1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1],
  [1,0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,1,1,0,1,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

let player = { x: 1, y: 1 };
const exitTile = { x: 19, y: 1 };

let enemy = { x: 1, y: 1 };
let enemyStarted = false;
let playerMoves = 0;
let gameOver = false;
let gameStarted = false;

const messageEl = document.getElementById('message');
const gridEl = document.getElementById('grid');

const screenEl = document.getElementById('game-screen');
const screenTitleEl = document.getElementById('screen-title');
const screenTextEl = document.getElementById('screen-text');
const screenActionEl = document.getElementById('screen-action');

const tileEls = [];

function buildGrid() {
  for (let y = 0; y < ROWS; y++) {
    const row = [];

    for (let x = 0; x < COLS; x++) {
      const tile = document.createElement('div');
      tile.classList.add('tile');

      if (map[y][x] === 1) {
        tile.classList.add('wall');
      }

      if (x === exitTile.x && y === exitTile.y) {
        tile.classList.add('exit');
      }

      gridEl.appendChild(tile);
      row.push(tile);
    }

    tileEls.push(row);
  }
}

const playerEl = document.createElement('div');
playerEl.classList.add('player-piece');
gridEl.appendChild(playerEl);

const enemyEl = document.createElement('div');
enemyEl.classList.add('enemy-piece');
gridEl.appendChild(enemyEl);

function draw() {
  const x = player.x * 28;
  const y = player.y * 28;

  playerEl.style.transform = `translate(${x}px, ${y}px)`;
}

function drawEnemy() {
  const x = enemy.x * 28;
  const y = enemy.y * 28;

  enemyEl.style.transform = `translate(${x}px, ${y}px)`;
}

function isWall(x, y) {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return true;
  return map[y][x] === 1;
}

function getOpenDirections(x, y) {
  const directions = [];

  if (!isWall(x, y - 1)) directions.push({ dx: 0, dy: -1 });
  if (!isWall(x, y + 1)) directions.push({ dx: 0, dy: 1 });
  if (!isWall(x - 1, y)) directions.push({ dx: -1, dy: 0 });
  if (!isWall(x + 1, y)) directions.push({ dx: 1, dy: 0 });

  return directions;
}

// ---- Enemy pathfinding ----
function getEnemyNextStep() {
  const queue = [{ x: enemy.x, y: enemy.y }];
  const visited = new Set();
  const previous = new Map();

  visited.add(`${enemy.x},${enemy.y}`);

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.x === player.x && current.y === player.y) {
      break;
    }

    const directions = getOpenDirections(current.x, current.y);

    for (const direction of directions) {
      const nextX = current.x + direction.dx;
      const nextY = current.y + direction.dy;
      const key = `${nextX},${nextY}`;

      if (!visited.has(key)) {
        visited.add(key);
        previous.set(key, current);
        queue.push({ x: nextX, y: nextY });
      }
    }
  }

  const playerKey = `${player.x},${player.y}`;

  if (!previous.has(playerKey)) {
    return null;
  }

  let current = { x: player.x, y: player.y };

  while (previous.has(`${current.x},${current.y}`)) {
    const before = previous.get(`${current.x},${current.y}`);

    if (before.x === enemy.x && before.y === enemy.y) {
      return current;
    }

    current = before;
  }

  return null;
}

let levelWon = false;
let moving = false;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- Player movement ----
async function tryMove(dx, dy) {
  if (!gameStarted || levelWon || gameOver || moving) return;

  moving = true;

  while (true) {
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (isWall(newX, newY)) {
      break;
    }

    player.x = newX;
    player.y = newY;

    draw();

    if (player.x === exitTile.x && player.y === exitTile.y) {
      checkWin();
      break;
    }

    await wait(70);

    const openDirections = getOpenDirections(player.x, player.y);
    const otherDirections = openDirections.filter(direction => {
      return !(direction.dx === -dx && direction.dy === -dy);
    });

    if (otherDirections.length > 1) {
      break;
    }

    if (isWall(player.x + dx, player.y + dy)) {
      break;
    }
  }

  moving = false;
}

// ---- Win checkkk ----
function checkWin() {
  if (player.x === exitTile.x && player.y === exitTile.y) {
    levelWon = true;
    messageEl.textContent = 'Floor cleared! You found the way out.';

    screenTitleEl.textContent = 'YOU ESCAPED';
    screenTextEl.innerHTML = 'You found the way out.';
    screenActionEl.textContent = 'Press R to play again';
    screenEl.style.display = 'flex';
  }
}

// ---- Enemyyy --------------
function moveEnemy() {
  if (!enemyStarted || !gameStarted || levelWon || gameOver || moving) return;

  const nextStep = getEnemyNextStep();

  if (!nextStep) return;

  enemy.x = nextStep.x;
  enemy.y = nextStep.y;

  drawEnemy();

  if (enemy.x === player.x && enemy.y === player.y) {
    gameOver = true;
    messageEl.textContent = 'You were caught.';

    screenTitleEl.textContent = 'YOU WERE CAUGHT';
    screenTextEl.innerHTML = 'The enemy caught you.';
    screenActionEl.textContent = 'Press R to restart';
    screenEl.style.display = 'flex';
  }
}

setInterval(moveEnemy, 750);

// ---- Typing-to-move ----
const wordList = [
  'shadow',
  'flicker',
  'hollow',
  'ember',
  'wander',
  'silent',
  'crawl',
  'echo',
  'dark',
  'ghost',
  'chase',
  'escape',
  'danger',
  'mist',
  'stone',
  'night',
  'fear',
  'run',
  'deep',
  'lost',
  'trap',
  'maze',
  'dead',
  'flame',
  'blood',
  'cold',
  'creep',
  'alone',
  'curse',
  'dread',
  'haunt',
  'break',
  'hide',
  'rush',
  'watch',
  'stalk',
  'drift',
  'panic',
  'quiet'
];

let currentWordIndex = 0;
let armedDirection = null;
let typedBuffer = '';

const wordTargetEl = document.getElementById('word-target');
const typedBufferEl = document.getElementById('typed-buffer');
const directionIconEl = document.getElementById('direction-icon');

const directionMap = {
  ArrowUp: { dx: 0, dy: -1, icon: '↑' },
  ArrowDown: { dx: 0, dy: 1, icon: '↓' },
  ArrowLeft: { dx: -1, dy: 0, icon: '←' },
  ArrowRight: { dx: 1, dy: 0, icon: '→' },
};

function updateDirectionIcon() {
  directionIconEl.textContent = armedDirection
    ? armedDirection.icon
    : '(pick a direction)';
}

function updateWordTarget() {
  wordTargetEl.textContent = wordList[currentWordIndex];
}

function updateTypedDisplay() {
  typedBufferEl.textContent = typedBuffer;
}

async function checkWordAndMove() {
  if (!gameStarted || !armedDirection || moving) return;

  const targetWord = wordList[currentWordIndex];

  if (typedBuffer.toLowerCase() === targetWord) {
    let newWordIndex = Math.floor(Math.random() * wordList.length);

    while (newWordIndex === currentWordIndex) {
      newWordIndex = Math.floor(Math.random() * wordList.length);
    }

    currentWordIndex = newWordIndex;
    typedBuffer = '';

    updateDirectionIcon();
    updateWordTarget();
    updateTypedDisplay();

    const startX = player.x;
    const startY = player.y;

    await tryMove(armedDirection.dx, armedDirection.dy);

    if (player.x !== startX || player.y !== startY) {
      playerMoves++;

      if (playerMoves >= 3) {
        enemyStarted = true;
      }
    }
  } else {
    typedBuffer = '';
    updateTypedDisplay();
  }
}

// ---- Reset ----
function resetGame() {
  player = { x: 1, y: 1 };
  enemy = { x: 1, y: 1 };

  enemyStarted = false;
  playerMoves = 0;
  gameOver = false;
  levelWon = false;
  moving = false;

  currentWordIndex = 0;
  armedDirection = null;
  typedBuffer = '';

  messageEl.textContent = '';

  screenTitleEl.textContent = 'DUNGEON';
  screenTextEl.innerHTML = `
    An enemy is coming for you.<br><br>
    Choose a direction with an Arrow Key.<br>
    Type the word shown on screen.<br>
    Press Enter to move.<br><br>
    Reach the exit before you're caught.
  `;
  screenActionEl.textContent = 'Press Enter to start';

  updateWordTarget();
  updateDirectionIcon();
  updateTypedDisplay();

  draw();
  drawEnemy();

  gameStarted = false;
  screenEl.style.display = 'flex';
}

// ---- Keyboard controls ----
window.addEventListener('keydown', (e) => {
  const key = e.key;

  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
  }

  if (e.repeat) return;

  if (key === 'Tab') {
    e.preventDefault();
    return;
  }

  if (!gameStarted) {
    if (key === 'Enter') {
      gameStarted = true;
      screenEl.style.display = 'none';
    }

    return;
  }

  if (levelWon || gameOver) {
    if (key.toLowerCase() === 'r') {
      resetGame();
    }

    return;
  }

  if (directionMap[key]) {
    e.preventDefault();
    armedDirection = directionMap[key];
    updateDirectionIcon();
    return;
  }

  if (key === 'Enter') {
    e.preventDefault();
    checkWordAndMove();
    return;
  }

  if (key === 'Backspace') {
    e.preventDefault();
    typedBuffer = typedBuffer.slice(0, -1);
    updateTypedDisplay();
    return;
  }

  if (key.length === 1 && /[a-zA-Z]/.test(key)) {
    e.preventDefault();
    typedBuffer += key.toLowerCase();
    updateTypedDisplay();
  }
});

window.addEventListener('blur', () => {
  typedBuffer = '';
  updateTypedDisplay();
});

// ---- Init ----
buildGrid();
draw();
drawEnemy();
updateWordTarget();
updateDirectionIcon();
updateTypedDisplay();
