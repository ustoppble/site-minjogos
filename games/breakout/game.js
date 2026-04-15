/* ============================================
   BREAKOUT — Mini Jogos
   Jogo completo com Canvas HTML5
   ============================================ */

(function () {
  'use strict';

  // --- Constantes ---
  const CANVAS_WIDTH  = 480;
  const CANVAS_HEIGHT = 400;
  const ASPECT_RATIO  = CANVAS_WIDTH / CANVAS_HEIGHT;

  const PADDLE_HEIGHT  = 12;
  const PADDLE_WIDTH   = 80;
  const PADDLE_Y_OFFSET = 30; // distancia do fundo

  const BALL_RADIUS   = 7;
  const BALL_SPEED_INITIAL = 4.5;
  const BALL_SPEED_MAX     = 9;
  const BALL_SPEED_INCREMENT = 0.25; // aumento por bloco destruido

  const COLS = 8;
  const ROWS = 5;
  const BRICK_GAP    = 5;
  const BRICK_TOP_OFFSET = 50;
  const BRICK_HEIGHT = 20;

  // Pontos e cores por linha (linha 0 = topo = mais pontos)
  const ROW_CONFIG = [
    { points: 50, color: '#ff5757' },   // vermelho — danger
    { points: 40, color: '#ff8c42' },   // laranja
    { points: 30, color: '#ffb347' },   // amarelo — warning
    { points: 20, color: '#00e5a0' },   // verde — accent
    { points: 10, color: '#7c5cff' },   // roxo — primary
  ];

  const COLOR_PADDLE = '#7c5cff';
  const COLOR_BALL   = '#e8e8f0';
  const COLOR_BG     = '#0f0f23';
  const COLOR_TRAIL  = 'rgba(124, 92, 255, 0.15)';

  // --- Estado do Jogo ---
  let state = 'idle'; // idle | running | paused | over | win
  let score = 0;
  let lives = 3;
  let bricks = [];
  let totalBricks = 0;
  let destroyedBricks = 0;
  let animFrameId = null;
  let scale = 1;

  let paddle = {
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: CANVAS_HEIGHT - PADDLE_Y_OFFSET,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dx: 0,
    speed: 6,
  };

  let ball = {
    x: 0, y: 0,
    dx: 0, dy: 0,
    radius: BALL_RADIUS,
    speed: BALL_SPEED_INITIAL,
    launched: false,
  };

  // Trail de particulas visuais
  let trail = [];

  // --- Elementos DOM ---
  const canvas      = document.getElementById('gameCanvas');
  const ctx         = canvas.getContext('2d');
  const scoreEl     = document.getElementById('score');
  const livesEl     = document.getElementById('lives');
  const highscoreEl = document.getElementById('highscore');
  const overlay     = document.getElementById('gameOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMsg  = document.getElementById('overlayMsg');
  const overlayBtn  = document.getElementById('overlayBtn');
  const startBtn    = document.getElementById('startBtn');
  const restartBtn  = document.getElementById('restartBtn');

  // --- Calculo de dimensoes ---
  function getCanvasScale() {
    return canvas.offsetWidth / CANVAS_WIDTH;
  }

  function setupCanvas() {
    canvas.width  = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }

  // --- Inicializacao ---
  function initGame() {
    score = 0;
    lives = 3;
    destroyedBricks = 0;
    trail = [];

    updateScoreDisplay();
    updateLivesDisplay();
    updateHighscoreDisplay();

    initBricks();
    resetBallAndPaddle();
  }

  function initBricks() {
    bricks = [];
    const paddingLeft = BRICK_GAP;
    const brickWidth = (CANVAS_WIDTH - (COLS + 1) * BRICK_GAP) / COLS;

    for (let row = 0; row < ROWS; row++) {
      bricks[row] = [];
      for (let col = 0; col < COLS; col++) {
        const x = paddingLeft + col * (brickWidth + BRICK_GAP);
        const y = BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_GAP);
        bricks[row][col] = {
          x, y,
          width: brickWidth,
          height: BRICK_HEIGHT,
          alive: true,
          points: ROW_CONFIG[row].points,
          color: ROW_CONFIG[row].color,
          // Animacao de destruicao
          dying: false,
          dyingProgress: 0,
        };
      }
    }
    totalBricks = ROWS * COLS;
  }

  function resetBallAndPaddle() {
    paddle.x = CANVAS_WIDTH / 2 - paddle.width / 2;
    paddle.y = CANVAS_HEIGHT - PADDLE_Y_OFFSET;

    ball.x = CANVAS_WIDTH / 2;
    ball.y = paddle.y - BALL_RADIUS - 2;
    ball.launched = false;

    // Angulo inicial aleatorio entre -45 e 45 graus, sempre subindo
    const angle = (Math.random() * 90 - 45) * (Math.PI / 180);
    ball.dx = Math.sin(angle) * ball.speed;
    ball.dy = -Math.abs(Math.cos(angle) * ball.speed);
  }

  // --- Logica de bola (launch ao inicio) ---
  function launchBall() {
    if (ball.launched) return;
    ball.launched = true;
    ball.speed = BALL_SPEED_INITIAL;
    const angle = (Math.random() * 60 - 30) * (Math.PI / 180);
    ball.dx = Math.sin(angle) * ball.speed;
    ball.dy = -Math.abs(Math.cos(angle) * ball.speed);
  }

  // --- Update ---
  function update() {
    if (state !== 'running') return;

    // Mover paddle por teclado
    if (keys.ArrowLeft || keys.a) paddle.dx = -paddle.speed;
    else if (keys.ArrowRight || keys.d) paddle.dx = paddle.speed;
    else paddle.dx = 0;

    paddle.x += paddle.dx;
    paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, paddle.x));

    // Bola segue a raquete enquanto nao foi lancada
    if (!ball.launched) {
      ball.x = paddle.x + paddle.width / 2;
      ball.y = paddle.y - BALL_RADIUS - 2;
      return;
    }

    // Adicionar posicao ao trail
    trail.push({ x: ball.x, y: ball.y, r: BALL_RADIUS });
    if (trail.length > 8) trail.shift();

    // Mover bola
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Colisao com paredes laterais
    if (ball.x - BALL_RADIUS <= 0) {
      ball.x = BALL_RADIUS;
      ball.dx = Math.abs(ball.dx);
    } else if (ball.x + BALL_RADIUS >= CANVAS_WIDTH) {
      ball.x = CANVAS_WIDTH - BALL_RADIUS;
      ball.dx = -Math.abs(ball.dx);
    }

    // Colisao com teto
    if (ball.y - BALL_RADIUS <= 0) {
      ball.y = BALL_RADIUS;
      ball.dy = Math.abs(ball.dy);
    }

    // Colisao com raquete
    if (
      ball.dy > 0 &&
      ball.y + BALL_RADIUS >= paddle.y &&
      ball.y + BALL_RADIUS <= paddle.y + paddle.height &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.width
    ) {
      ball.y = paddle.y - BALL_RADIUS;
      // Angulo de rebote baseado no ponto de impacto
      const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2); // -1 a 1
      const bounceAngle = hitPos * 65 * (Math.PI / 180); // max 65 graus
      const speed = Math.min(ball.speed, BALL_SPEED_MAX);
      ball.dx = Math.sin(bounceAngle) * speed;
      ball.dy = -Math.abs(Math.cos(bounceAngle) * speed);
    }

    // Bola caiu abaixo da tela
    if (ball.y - BALL_RADIUS > CANVAS_HEIGHT) {
      lives--;
      updateLivesDisplay();
      trail = [];

      if (lives <= 0) {
        gameOver();
        return;
      }
      resetBallAndPaddle();
      return;
    }

    // Colisao com blocos
    checkBrickCollisions();
  }

  function checkBrickCollisions() {
    const brickWidth = (CANVAS_WIDTH - (COLS + 1) * BRICK_GAP) / COLS;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const b = bricks[row][col];
        if (!b.alive) continue;

        // AABB com bola (circulo vs retangulo — closest point)
        const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.width));
        const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.height));
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const distSq = distX * distX + distY * distY;

        if (distSq <= BALL_RADIUS * BALL_RADIUS) {
          b.alive = false;
          destroyedBricks++;

          // Adicionar pontos
          score += b.points;
          updateScoreDisplay();

          // Aumentar velocidade gradualmente
          ball.speed = Math.min(
            BALL_SPEED_INITIAL + destroyedBricks * BALL_SPEED_INCREMENT,
            BALL_SPEED_MAX
          );

          // Determinar direcao de rebote
          const overlapLeft   = ball.x - (b.x + b.width);
          const overlapRight  = b.x - (ball.x + BALL_RADIUS);
          const overlapTop    = ball.y - (b.y + b.height);
          const overlapBottom = b.y - (ball.y + BALL_RADIUS);

          const minOverlapH = Math.abs(overlapLeft) < Math.abs(overlapRight) ? overlapLeft : overlapRight;
          const minOverlapV = Math.abs(overlapTop) < Math.abs(overlapBottom) ? overlapTop : overlapBottom;

          if (Math.abs(minOverlapH) < Math.abs(minOverlapV)) {
            ball.dx = -ball.dx;
          } else {
            ball.dy = -ball.dy;
          }

          // Normalizar velocidade
          const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
          if (currentSpeed > 0) {
            ball.dx = (ball.dx / currentSpeed) * ball.speed;
            ball.dy = (ball.dy / currentSpeed) * ball.speed;
          }

          // Verificar vitoria
          if (destroyedBricks >= totalBricks) {
            win();
            return;
          }

          // Processar apenas um bloco por frame para evitar bugs
          return;
        }
      }
    }
  }

  // --- Render ---
  function render() {
    // Fundo
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grade sutil de fundo
    drawGrid();

    // Blocos
    drawBricks();

    // Trail da bola
    drawTrail();

    // Bola
    drawBall();

    // Raquete
    drawPaddle();

    // Indicador de "pressione para lancar"
    if (state === 'running' && !ball.launched) {
      ctx.fillStyle = 'rgba(232, 232, 240, 0.5)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Pressione ESPACO ou clique para lançar', CANVAS_WIDTH / 2, paddle.y - 20);
    }
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(58, 58, 106, 0.3)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  }

  function drawBricks() {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const b = bricks[row][col];
        if (!b.alive) continue;

        // Brilho/sombra
        ctx.save();
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        roundRect(ctx, b.x, b.y, b.width, b.height, 4);
        ctx.fill();
        ctx.restore();

        // Destaque claro no topo do bloco
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        roundRect(ctx, b.x + 2, b.y + 2, b.width - 4, 4, 2);
        ctx.fill();
      }
    }
  }

  function drawTrail() {
    for (let i = 0; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.35;
      const radius = BALL_RADIUS * (0.3 + 0.7 * (i / trail.length));
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(124, 92, 255, ${alpha})`;
      ctx.fill();
    }
  }

  function drawBall() {
    // Glow
    ctx.save();
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_BALL;
    ctx.fill();
    ctx.restore();

    // Brilho interno
    const grad = ctx.createRadialGradient(
      ball.x - 2, ball.y - 2, 1,
      ball.x, ball.y, BALL_RADIUS
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(232,232,240,0)');
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function drawPaddle() {
    ctx.save();
    ctx.shadowColor = COLOR_PADDLE;
    ctx.shadowBlur = 14;

    // Gradiente da raquete
    const grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    grad.addColorStop(0, '#9b7fff');
    grad.addColorStop(1, COLOR_PADDLE);

    ctx.fillStyle = grad;
    ctx.beginPath();
    roundRect(ctx, paddle.x, paddle.y, paddle.width, paddle.height, 6);
    ctx.fill();
    ctx.restore();

    // Brilho no topo
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    roundRect(ctx, paddle.x + 4, paddle.y + 2, paddle.width - 8, 3, 2);
    ctx.fill();
  }

  // Utilitario: retangulo arredondado compativel com browsers sem roundRect nativo
  function roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }

  // --- Loop principal ---
  function gameLoop() {
    update();
    render();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  // --- Controle de estado ---
  function startGame() {
    if (state === 'running') return;
    initGame();
    state = 'running';
    hideOverlay();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    gameLoop();
  }

  function restartGame() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    state = 'idle';
    startGame();
  }

  function gameOver() {
    state = 'over';
    MiniJogos.saveHighScore('breakout', score);
    updateHighscoreDisplay();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    showOverlay('Game Over', `Pontuação final: ${MiniJogos.formatScore(score)}`, 'Jogar Novamente');
  }

  function win() {
    state = 'win';
    MiniJogos.saveHighScore('breakout', score);
    updateHighscoreDisplay();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    showOverlay('Você Venceu! 🎉', `Pontuação: ${MiniJogos.formatScore(score)}`, 'Jogar Novamente');
  }

  // --- Overlay ---
  function showOverlay(title, msg, btnText) {
    overlayTitle.textContent = title;
    overlayMsg.textContent   = msg;
    overlayBtn.textContent   = btnText;
    overlay.classList.add('visible');
  }

  function hideOverlay() {
    overlay.classList.remove('visible');
  }

  // --- UI ---
  function updateScoreDisplay() {
    scoreEl.textContent = MiniJogos.formatScore(score);
  }

  function updateLivesDisplay() {
    livesEl.textContent = lives;
  }

  function updateHighscoreDisplay() {
    if (highscoreEl) {
      highscoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('breakout'));
    }
  }

  // --- Teclado ---
  const keys = {};

  document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    keys[e.code] = true;

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (state === 'running') {
        launchBall();
      } else if (state === 'idle' || state === 'over' || state === 'win') {
        startGame();
      }
    }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && state === 'running') {
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    keys[e.code] = false;
  });

  // --- Mouse ---
  canvas.addEventListener('mousemove', (e) => {
    if (state !== 'running') return;
    const rect  = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    paddle.x = mouseX - paddle.width / 2;
    paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, paddle.x));
  });

  canvas.addEventListener('click', (e) => {
    if (state === 'running') {
      launchBall();
    }
  });

  // --- Touch ---
  let touchStartX = 0;
  let touchPaddleStartX = 0;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect  = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    touchStartX = touch.clientX;
    touchPaddleStartX = paddle.x;
    if (state === 'running') launchBall();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (state !== 'running') return;
    const touch = e.touches[0];
    const rect  = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const delta  = (touch.clientX - touchStartX) * scaleX;
    paddle.x = touchPaddleStartX + delta;
    paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, paddle.x));
  }, { passive: false });

  // --- Botoes ---
  startBtn.addEventListener('click', () => {
    if (state === 'idle' || state === 'over' || state === 'win') {
      startGame();
    } else if (state === 'running') {
      launchBall();
    }
  });

  restartBtn.addEventListener('click', () => {
    restartGame();
  });

  overlayBtn.addEventListener('click', () => {
    startGame();
  });

  // --- Responsividade ---
  window.addEventListener('resize', () => {
    // Canvas e responsivo via CSS, o width/height interno e fixo
  });

  // --- Render inicial (tela idle) ---
  function renderIdle() {
    setupCanvas();
    initGame();

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawGrid();
    drawBricks();
    drawPaddle();
    drawBall();

    showOverlay('Breakout 🧱', 'Destrua todos os blocos sem deixar a bola cair!', 'Iniciar');
  }

  // --- Boot ---
  setupCanvas();
  updateHighscoreDisplay();
  renderIdle();

})();
