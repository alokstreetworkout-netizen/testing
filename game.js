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

const wordUpEl = document.getElementById('word-up');
const wordDownEl = document.getElementById('word-down');
const wordLeftEl = document.getElementById('word-left');
const wordRightEl = document.getElementById('word-right');
const typedBufferEl = document.getElementById('typed-buffer');

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

// ---- Direction words ----
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

const directionWords = {
  up: '',
  down: '',
  left: '',
  right: ''
};

let typedBuffer = '';

function setDirectionWords() {
  const availableWords = [...wordList];

  for (const direction of Object.keys(directionWords)) {
    const randomIndex = Math.floor(Math.random() * availableWords.length);

    directionWords[direction] = availableWords[randomIndex];

    availableWords.splice(randomIndex, 1);
  }

  wordUpEl.textContent = directionWords.up;
  wordDownEl.textContent = directionWords.down;
  wordLeftEl.textContent = directionWords.left;
  wordRightEl.textContent = directionWords.right;
}

function updateTypedDisplay() {
  typedBufferEl.textContent = typedBuffer;
}

function getTypedDirection() {
  if (typedBuffer === directionWords.up) return 'up';
  if (typedBuffer === directionWords.down) return 'down';
  if (typedBuffer === directionWords.left) return 'left';
  if (typedBuffer === directionWords.right) return 'right';

  return null;
}

async function checkWordAndMove() {
  if (!gameStarted || moving) return;

  const direction = getTypedDirection();

  if (!direction) {
    typedBuffer = '';
    updateTypedDisplay();
    return;
  }

  typedBuffer = '';
  updateTypedDisplay();

  setDirectionWords();

  const startX = player.x;
  const startY = player.y;

  if (direction === 'up') {
    await tryMove(0, -1);
  }

  if (direction === 'down') {
    await tryMove(0, 1);
  }

  if (direction === 'left') {
    await tryMove(-1, 0);
  }

  if (direction === 'right') {
    await tryMove(1, 0);
  }

  if (player.x !== startX || player.y !== startY) {
    playerMoves++;

    if (playerMoves >= 3) {
      enemyStarted = true;
    }
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
  gameStarted = false;

  typedBuffer = '';

  messageEl.textContent = '';

  setDirectionWords();
  updateTypedDisplay();

  screenTitleEl.textContent = 'DUNGEON';

  screenTextEl.innerHTML = `
    An enemy is coming for you.<br><br>
    Type the word for the direction you want to move.<br>
    Press Enter or Space to move.<br><br>
    Reach the exit before you're caught.
  `;

  screenActionEl.textContent = 'Press Enter to start';

  draw();
  drawEnemy();

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

  if (key === 'Enter' || key === ' ') {
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
setDirectionWords();
draw();
drawEnemy();
updateTypedDisplay();

screenEl.style.display = 'flex';

// ---- Auto-fit to viewport (appended — does not modify game logic) ----
function fitToViewport() {
  document.body.style.transform = 'scale(1)';
  const scaleX = window.innerWidth / document.body.scrollWidth;
  const scaleY = window.innerHeight / document.body.scrollHeight;
  const scale = Math.min(scaleX, scaleY, 1);
  document.body.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', fitToViewport);
fitToViewport();
