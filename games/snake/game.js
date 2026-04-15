/* ============================================
   SNAKE — Mini Jogos
   game.js — Lógica completa do jogo
   ============================================ */

(function () {
  'use strict';

  // --- Constantes ---
  const GRID_SIZE = 20;        // células na grade
  const CELL_COUNT = 20;       // 20x20 grade
  const INITIAL_SPEED = 150;   // ms por frame (menor = mais rápido)
  const MIN_SPEED = 60;        // velocidade máxima
  const SPEED_STEP = 5;        // redução por comida

  const COLOR_BG = '#0f0f23';
  const COLOR_GRID = '#1a1a3e';
  const COLOR_SNAKE_HEAD = '#00e5a0';
  const COLOR_SNAKE_BODY = '#00b87a';
  const COLOR_SNAKE_BORDER = '#00c890';
  const COLOR_FOOD = '#ff5757';
  const COLOR_FOOD_GLOW = 'rgba(255, 87, 87, 0.35)';
  const COLOR_EYES = '#0f0f23';
  const COLOR_GAME_OVER = '#ff5757';
  const COLOR_TEXT = '#e8e8f0';
  const COLOR_SCORE_FLASH = '#00e5a0';

  // --- Estado do jogo ---
  let canvas, ctx;
  let cellSize;
  let snake = [];
  let food = {};
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let score = 0;
  let highScore = 0;
  let gameState = 'idle'; // idle | running | paused | gameover
  let loopTimeout = null;
  let speed = INITIAL_SPEED;
  let foodAnim = 0; // para animação pulsante da comida
  let touchStartX = 0;
  let touchStartY = 0;

  // --- Elementos DOM ---
  const scoreEl = document.getElementById('score');
  const highscoreEl = document.getElementById('highscore');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const overlay = document.getElementById('gameOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMsg = document.getElementById('overlayMsg');
  const overlayBtn = document.getElementById('overlayBtn');

  // --- Inicialização ---
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    highScore = MiniJogos.getHighScore('snake');
    updateHighscoreDisplay();

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    drawIdleScreen();

    // Controles teclado
    document.addEventListener('keydown', handleKeyDown);

    // Controles touch
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    // Previne scroll ao deslizar sobre o canvas
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // Botões
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    overlayBtn.addEventListener('click', () => {
      if (gameState === 'idle' || gameState === 'gameover') {
        startGame();
      }
    });
  }

  // --- Redimensionamento responsivo ---
  function resizeCanvas() {
    const wrapper = canvas.parentElement;
    const available = wrapper.clientWidth - 32; // padding do wrapper
    const size = Math.min(available, 400);
    cellSize = Math.floor(size / CELL_COUNT);
    const actualSize = cellSize * CELL_COUNT;

    canvas.width = actualSize;
    canvas.height = actualSize;

    // Redesenhar conforme estado
    if (gameState === 'idle') {
      drawIdleScreen();
    } else if (gameState === 'gameover') {
      redrawGame();
    } else if (gameState === 'running' || gameState === 'paused') {
      redrawGame();
    }
  }

  // --- Iniciar jogo ---
  function startGame() {
    if (gameState === 'running') return;

    score = 0;
    speed = INITIAL_SPEED;
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };

    // Cobra começa no centro, 3 células de comprimento
    const midY = Math.floor(CELL_COUNT / 2);
    const midX = Math.floor(CELL_COUNT / 2);
    snake = [
      { x: midX, y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ];

    spawnFood();
    updateScoreDisplay();
    hideOverlay();

    gameState = 'running';
    scheduleLoop();
  }

  function restartGame() {
    stopLoop();
    gameState = 'idle';
    startGame();
  }

  // --- Loop principal ---
  function scheduleLoop() {
    loopTimeout = setTimeout(gameLoop, speed);
  }

  function stopLoop() {
    if (loopTimeout) {
      clearTimeout(loopTimeout);
      loopTimeout = null;
    }
  }

  function gameLoop() {
    if (gameState !== 'running') return;

    foodAnim = (foodAnim + 1) % 60;
    update();
    redrawGame();

    if (gameState === 'running') {
      scheduleLoop();
    }
  }

  // --- Atualização de estado ---
  function update() {
    direction = { ...nextDirection };

    const head = snake[0];
    const newHead = {
      x: head.x + direction.x,
      y: head.y + direction.y,
    };

    // Colisão com parede
    if (
      newHead.x < 0 || newHead.x >= CELL_COUNT ||
      newHead.y < 0 || newHead.y >= CELL_COUNT
    ) {
      endGame();
      return;
    }

    // Colisão com o próprio corpo
    if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      endGame();
      return;
    }

    snake.unshift(newHead);

    // Comeu a comida?
    if (newHead.x === food.x && newHead.y === food.y) {
      score += 10;
      updateScoreDisplay();
      spawnFood();
      // Aumentar velocidade gradualmente
      if (speed > MIN_SPEED) {
        speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
      }
    } else {
      snake.pop();
    }
  }

  // --- Fim de jogo ---
  function endGame() {
    stopLoop();
    gameState = 'gameover';

    const isNewRecord = MiniJogos.saveHighScore('snake', score);
    highScore = MiniJogos.getHighScore('snake');
    updateHighscoreDisplay();

    redrawGame();

    const msg = isNewRecord && score > 0
      ? `Novo recorde: ${MiniJogos.formatScore(score)}!`
      : `Pontuação: ${MiniJogos.formatScore(score)}`;

    showOverlay('Game Over 💀', msg, 'Jogar Novamente');
  }

  // --- Spawnar comida ---
  function spawnFood() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * CELL_COUNT),
        y: Math.floor(Math.random() * CELL_COUNT),
      };
    } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
    food = pos;
  }

  // --- Renderização ---
  function redrawGame() {
    drawBackground();
    drawFood();
    drawSnake();
    if (gameState === 'gameover') {
      drawGameOverEffect();
    }
  }

  function drawIdleScreen() {
    drawBackground();
    // Grade vazia com cobra demo
    const demoSnake = [
      { x: 11, y: 10 }, { x: 10, y: 10 }, { x: 9, y: 10 },
      { x: 8, y: 10 }, { x: 7, y: 10 }
    ];
    const demoFood = { x: 13, y: 10 };

    drawFoodAt(demoFood, false);
    drawSnakeSegments(demoSnake);
  }

  function drawBackground() {
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grade sutil
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= CELL_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }
  }

  function drawFood() {
    const pulse = Math.sin(foodAnim * (Math.PI / 30)); // oscila entre -1 e 1
    drawFoodAt(food, true, pulse);
  }

  function drawFoodAt(pos, animated, pulse = 0) {
    const x = pos.x * cellSize;
    const y = pos.y * cellSize;
    const padding = 2;
    const size = cellSize - padding * 2;
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    const radius = (size / 2) * (animated ? 1 + pulse * 0.08 : 1);

    // Brilho externo
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.8);
    glow.addColorStop(0, COLOR_FOOD_GLOW);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Círculo da comida
    ctx.fillStyle = COLOR_FOOD;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Brilho interno
    ctx.fillStyle = 'rgba(255, 180, 180, 0.5)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSnake() {
    drawSnakeSegments(snake);
  }

  function drawSnakeSegments(segments) {
    if (segments.length === 0) return;

    segments.forEach((seg, i) => {
      const isHead = i === 0;
      const isTail = i === segments.length - 1;
      drawSegment(seg, isHead, isTail, i, segments.length);
    });

    // Olhos na cabeça
    if (segments.length > 0) {
      drawEyes(segments[0], segments.length > 1 ? segments[1] : null);
    }
  }

  function drawSegment(seg, isHead, isTail, index, total) {
    const x = seg.x * cellSize;
    const y = seg.y * cellSize;
    const padding = 1;
    const size = cellSize - padding * 2;

    const alpha = isHead ? 1 : Math.max(0.5, 1 - (index / total) * 0.4);
    const color = isHead ? COLOR_SNAKE_HEAD : COLOR_SNAKE_BODY;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Borda
    ctx.fillStyle = COLOR_SNAKE_BORDER;
    roundRect(ctx, x + padding - 1, y + padding - 1, size + 2, size + 2, isHead ? 5 : 3);
    ctx.fill();

    // Corpo
    ctx.fillStyle = color;
    roundRect(ctx, x + padding, y + padding, size, size, isHead ? 5 : 3);
    ctx.fill();

    // Brilho no topo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    roundRect(ctx, x + padding + 1, y + padding + 1, size - 2, size / 2.5, isHead ? 4 : 2);
    ctx.fill();

    ctx.restore();
  }

  function drawEyes(head, neck) {
    const hx = head.x * cellSize + cellSize / 2;
    const hy = head.y * cellSize + cellSize / 2;
    const eyeRadius = Math.max(1.5, cellSize * 0.1);
    const eyeOffset = cellSize * 0.22;

    // Determinar orientação dos olhos com base na direção
    let dx = direction.x;
    let dy = direction.y;
    // Se não tem direção definida, usar diferença com pescoço
    if (neck && dx === 0 && dy === 0) {
      dx = head.x - neck.x;
      dy = head.y - neck.y;
    }

    let eye1, eye2;
    if (dx === 1) {       // direita
      eye1 = { x: hx + eyeOffset * 0.6, y: hy - eyeOffset };
      eye2 = { x: hx + eyeOffset * 0.6, y: hy + eyeOffset };
    } else if (dx === -1) { // esquerda
      eye1 = { x: hx - eyeOffset * 0.6, y: hy - eyeOffset };
      eye2 = { x: hx - eyeOffset * 0.6, y: hy + eyeOffset };
    } else if (dy === -1) { // cima
      eye1 = { x: hx - eyeOffset, y: hy - eyeOffset * 0.6 };
      eye2 = { x: hx + eyeOffset, y: hy - eyeOffset * 0.6 };
    } else {               // baixo (padrão)
      eye1 = { x: hx - eyeOffset, y: hy + eyeOffset * 0.6 };
      eye2 = { x: hx + eyeOffset, y: hy + eyeOffset * 0.6 };
    }

    [eye1, eye2].forEach(eye => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, eyeRadius * 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLOR_EYES;
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawGameOverEffect() {
    ctx.fillStyle = 'rgba(15, 15, 35, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // --- Utilitário: roundRect ---
  function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // --- Overlay ---
  function showOverlay(title, msg, btnText) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    overlayBtn.textContent = btnText;
    overlay.classList.add('visible');
  }

  function hideOverlay() {
    overlay.classList.remove('visible');
  }

  // --- Atualizar displays ---
  function updateScoreDisplay() {
    scoreEl.textContent = MiniJogos.formatScore(score);
  }

  function updateHighscoreDisplay() {
    highscoreEl.textContent = MiniJogos.formatScore(highScore);
  }

  // --- Controles de teclado ---
  function handleKeyDown(e) {
    const key = e.key;

    // Iniciar com Enter/Espaço se idle/gameover
    if ((key === 'Enter' || key === ' ') && (gameState === 'idle' || gameState === 'gameover')) {
      e.preventDefault();
      startGame();
      return;
    }

    if (gameState !== 'running') return;

    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
        break;
    }
  }

  // --- Controles touch (swipe) ---
  function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function handleTouchEnd(e) {
    if (gameState === 'idle' || gameState === 'gameover') {
      startGame();
      return;
    }

    if (gameState !== 'running') return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const minSwipe = 20;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal
      if (dx > 0 && direction.x !== -1) {
        nextDirection = { x: 1, y: 0 };
      } else if (dx < 0 && direction.x !== 1) {
        nextDirection = { x: -1, y: 0 };
      }
    } else {
      // Vertical
      if (dy > 0 && direction.y !== -1) {
        nextDirection = { x: 0, y: 1 };
      } else if (dy < 0 && direction.y !== 1) {
        nextDirection = { x: 0, y: -1 };
      }
    }
  }

  // --- Arrancar quando o DOM estiver pronto ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
