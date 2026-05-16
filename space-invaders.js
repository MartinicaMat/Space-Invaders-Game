#!/usr/bin/env node
// ============================================
//   SPACE INVADERS - Create Studios
//   by MartinicaMat
// ============================================

const readline = require('readline');

// --- Config ---
const WIDTH = 60;
const HEIGHT = 24;
const TICK = 80; // ms

// --- État du jeu ---
let state = {
  player: { x: Math.floor(WIDTH / 2), y: HEIGHT - 2 },
  bullets: [],        // { x, y }
  enemyBullets: [],   // { x, y }
  enemies: [],        // { x, y, alive }
  score: 0,
  lives: 3,
  level: 1,
  enemyDir: 1,        // 1 = droite, -1 = gauche
  enemyMoveTimer: 0,
  enemyMoveInterval: 20,
  enemyShootTimer: 0,
  gameOver: false,
  win: false,
  frame: 0,
};

// --- Sprites ASCII ---
const PLAYER   = 'A';
const BULLET   = '|';
const ENEMY_B  = ['W', 'M']; // Animation ennemis
const E_BULLET = 'v';
const SHIELD   = '#';

// --- Boucliers ---
function createShields() {
  const shields = [];
  const positions = [10, 22, 34, 46];
  for (const sx of positions) {
    for (let dx = 0; dx < 5; dx++) {
      shields.push({ x: sx + dx, y: HEIGHT - 5, hp: 3 });
    }
  }
  return shields;
}

// --- Création des ennemis ---
function createEnemies(level) {
  const enemies = [];
  const rows = Math.min(3 + level, 5);
  const cols = 10;
  const startX = 5;
  const startY = 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      enemies.push({ x: startX + c * 5, y: startY + r * 2, alive: true, row: r });
    }
  }
  return enemies;
}

// --- Init ---
function initGame(level = 1) {
  state.player = { x: Math.floor(WIDTH / 2), y: HEIGHT - 2 };
  state.bullets = [];
  state.enemyBullets = [];
  state.enemies = createEnemies(level);
  state.shields = createShields();
  state.enemyDir = 1;
  state.enemyMoveTimer = 0;
  state.enemyMoveInterval = Math.max(5, 20 - level * 3);
  state.enemyShootTimer = 0;
  state.gameOver = false;
  state.win = false;
  state.frame = 0;
}

// --- Rendu ---
function render() {
  // Grille vide
  const grid = [];
  for (let y = 0; y < HEIGHT; y++) {
    grid.push(Array(WIDTH).fill(' '));
  }

  // Boucliers
  for (const s of state.shields) {
    if (s.hp > 0) {
      const ch = s.hp === 3 ? '#' : s.hp === 2 ? '%' : '.';
      if (s.x >= 0 && s.x < WIDTH && s.y >= 0 && s.y < HEIGHT)
        grid[s.y][s.x] = ch;
    }
  }

  // Ennemis
  const sprite = ENEMY_B[state.frame % 2];
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.x >= 0 && e.x < WIDTH && e.y >= 0 && e.y < HEIGHT)
      grid[e.y][e.x] = e.row < 1 ? '^' : sprite;
  }

  // Joueur
  if (state.player.x >= 0 && state.player.x < WIDTH)
    grid[state.player.y][state.player.x] = PLAYER;

  // Balles joueur
  for (const b of state.bullets) {
    if (b.x >= 0 && b.x < WIDTH && b.y >= 0 && b.y < HEIGHT)
      grid[b.y][b.x] = BULLET;
  }

  // Balles ennemis
  for (const b of state.enemyBullets) {
    if (b.x >= 0 && b.x < WIDTH && b.y >= 0 && b.y < HEIGHT)
      grid[b.y][b.x] = E_BULLET;
  }

  // Bordure
  const border = '+' + '-'.repeat(WIDTH) + '+';
  const lines = [];
  lines.push(border);
  for (let y = 0; y < HEIGHT; y++) {
    lines.push('|' + grid[y].join('') + '|');
  }
  lines.push(border);

  // HUD
  const aliveCount = state.enemies.filter(e => e.alive).length;
  lines.push(
    ` Score: ${String(state.score).padEnd(8)} Vies: ${'<3 '.repeat(state.lives).trim()}   Niveau: ${state.level}   Ennemis: ${aliveCount}`
  );
  lines.push(` [←][→] Déplacer   [ESPACE] Tirer   [Q] Quitter`);

  // Affichage
  process.stdout.write('\x1B[H'); // Retour en haut
  process.stdout.write(lines.join('\n') + '\n');

  // Messages
  if (state.gameOver) {
    centerMsg('*** GAME OVER ***  -  Appuie sur [R] pour rejouer');
  } else if (state.win) {
    centerMsg(`*** NIVEAU ${state.level} TERMINE ! ***  -  Prochain niveau dans 2s...`);
  }
}

function centerMsg(msg) {
  const pad = Math.max(0, Math.floor((WIDTH - msg.length) / 2));
  console.log(' '.repeat(pad) + msg);
}

// --- Logique ---
function update() {
  if (state.gameOver || state.win) return;

  state.frame++;

  // Balles joueur
  state.bullets = state.bullets.filter(b => b.y > 0);
  for (const b of state.bullets) b.y--;

  // Balles ennemis
  state.enemyBullets = state.enemyBullets.filter(b => b.y < HEIGHT);
  for (const b of state.enemyBullets) b.y++;

  // Mouvement ennemis
  state.enemyMoveTimer++;
  if (state.enemyMoveTimer >= state.enemyMoveInterval) {
    state.enemyMoveTimer = 0;
    const alive = state.enemies.filter(e => e.alive);
    const maxX = Math.max(...alive.map(e => e.x));
    const minX = Math.min(...alive.map(e => e.x));

    if ((state.enemyDir === 1 && maxX >= WIDTH - 2) ||
        (state.enemyDir === -1 && minX <= 1)) {
      state.enemyDir *= -1;
      for (const e of state.enemies) e.y += 1;
    } else {
      for (const e of state.enemies) e.x += state.enemyDir;
    }

    // Ennemis atteignent le joueur
    for (const e of state.enemies) {
      if (e.alive && e.y >= state.player.y) {
        state.gameOver = true;
        return;
      }
    }
  }

  // Tirs ennemis
  state.enemyShootTimer++;
  const shootInterval = Math.max(8, 30 - state.level * 4);
  if (state.enemyShootTimer >= shootInterval) {
    state.enemyShootTimer = 0;
    const alive = state.enemies.filter(e => e.alive);
    if (alive.length > 0) {
      const shooter = alive[Math.floor(Math.random() * alive.length)];
      state.enemyBullets.push({ x: shooter.x, y: shooter.y + 1 });
    }
  }

  // Collisions: balles joueur vs ennemis
  for (const b of state.bullets) {
    for (const e of state.enemies) {
      if (e.alive && e.x === b.x && e.y === b.y) {
        e.alive = false;
        b.y = -1; // détruire la balle
        state.score += (e.row < 1 ? 30 : e.row < 2 ? 20 : 10);
      }
    }
  }

  // Collisions: balles vs boucliers
  for (const b of [...state.bullets, ...state.enemyBullets]) {
    for (const s of state.shields) {
      if (s.hp > 0 && s.x === b.x && s.y === b.y) {
        s.hp--;
        b.y = -1;
      }
    }
  }

  // Collisions: balles ennemis vs joueur
  for (const b of state.enemyBullets) {
    if (b.x === state.player.x && b.y === state.player.y) {
      b.y = HEIGHT + 1;
      state.lives--;
      if (state.lives <= 0) {
        state.gameOver = true;
        return;
      }
    }
  }

  // Victoire niveau
  if (state.enemies.every(e => !e.alive)) {
    state.win = true;
    setTimeout(() => {
      state.level++;
      initGame(state.level);
    }, 2000);
  }
}

// --- Input ---
function setupInput() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  process.stdin.on('keypress', (str, key) => {
    if (!key) return;

    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      cleanup();
      process.exit();
    }

    if (state.gameOver) {
      if (key.name === 'r') {
        state.score = 0;
        state.lives = 3;
        state.level = 1;
        initGame(1);
      }
      return;
    }

    if (state.win) return;

    if (key.name === 'left')  state.player.x = Math.max(1, state.player.x - 1);
    if (key.name === 'right') state.player.x = Math.min(WIDTH - 2, state.player.x + 1);
    if (key.name === 'space') {
      // Max 2 balles à la fois
      if (state.bullets.length < 2)
        state.bullets.push({ x: state.player.x, y: state.player.y - 1 });
    }
  });
}

function cleanup() {
  process.stdout.write('\x1B[?25h'); // Réafficher le curseur
  process.stdout.write('\x1B[2J\x1B[H'); // Vider l'écran
}

// --- Lancement ---
function main() {
  process.stdout.write('\x1B[2J\x1B[H'); // Clear screen
  process.stdout.write('\x1B[?25l');     // Cacher le curseur

  initGame(1);
  setupInput();

  const loop = setInterval(() => {
    update();
    render();
  }, TICK);

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(); });
}

main();
