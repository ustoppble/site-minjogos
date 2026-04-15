/* ============================================
   PONG — Mini Jogos
   Player vs CPU com Canvas API
   ============================================ */

(function () {
  'use strict';

  // --- Constantes ---
  const CANVAS_W = 500;
  const CANVAS_H = 350;
  const ASPECT = CANVAS_W / CANVAS_H;
  const WIN_SCORE = 11;

  const PADDLE_W = 10;
  const PADDLE_H = 70;
  const PADDLE_MARGIN = 18;
  const BALL_SIZE = 8;
  const BALL_SPEED_INIT = 4.5;
  const BALL_SPEED_MAX = 10;
  const BALL_SPEED_INC = 0.25;
  const CPU_SPEED = 3.2;
  const CPU_REACTION = 0.82; // 0-1: quanto da bola a CPU acerta

  const COLOR_BG = '#0f0f23';
  const COLOR_SURFACE = '#1a1a3e';
  const COLOR_ELEMENT = '#e8e8f0';
  const COLOR_NET = 'rgba(90, 90, 138, 0.6)';
  const COLOR_ACCENT = '#00e5a0';
  const COLOR_PRIMARY = '#7c5cff';
  const COLOR_DANGER = '#ff5757';

  // --- Estado ---
  let canvas, ctx;
  let scale = 1;
  let animId = null;
  let state = 'idle'; // idle | playing | paused | scored | gameover

  let playerScore = 0;
  let cpuScore = 0;
  let wins = 0;

  let flashTimer = 0;
  let flashSide = null; // 'player' | 'cpu'
  let lastScorer = null;

  const player = { x: 0, y: 0, w: PADDLE_W, h: PADDLE_H, dy: 0 };
  const cpu    = { x: 0, y: 0, w: PADDLE_W, h: PADDLE_H, dy: 0 };
  const ball   = { x: 0, y: 0, vx: 0, vy: 0, speed: BALL_SPEED_INIT };

  // --- Input ---
  const keys = {};
  let touchStartY = null;
  let touchCurrentY = null;

  // --- Init ---
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Teclado
    window.addEventListener('keydown', (e) => {
      keys[e.key] = true;
      if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { keys[e.key] = false; });

    // Touch
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });

    // Botões
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('overlayBtn').addEventListener('click', () => {
      if (state === 'gameover') restartGame();
      else startGame();
    });

    // High score
    wins = MiniJogos.getHighScore('pong');
    document.getElementById('highscore').textContent = wins;

    resetPositions();
    drawIdle();
  }

  // --- Resize ---
  function resizeCanvas() {
    const wrapper = canvas.parentElement;
    const maxW = Math.min(wrapper.clientWidth - 32, CANVAS_W);
    scale = maxW / CANVAS_W;
    canvas.width  = Math.round(CANVAS_W * scale);
    canvas.height = Math.round(CANVAS_H * scale);
  }

  // --- Reset ---
  function resetPositions() {
    player.x = PADDLE_MARGIN;
    player.y = (CANVAS_H - PADDLE_H) / 2;
    cpu.x    = CANVAS_W - PADDLE_MARGIN - PADDLE_W;
    cpu.y    = (CANVAS_H - PADDLE_H) / 2;
    resetBall(null);
  }

  function resetBall(direction) {
    ball.x = CANVAS_W / 2;
    ball.y = CANVAS_H / 2;
    ball.speed = BALL_SPEED_INIT;

    // Direção: quem tomou o ponto serve
    const angle = (Math.random() * 40 - 20) * (Math.PI / 180);
    let dir = direction === 'player' ? 1 : -1;
    if (direction === null) dir = Math.random() < 0.5 ? 1 : -1;

    ball.vx = dir * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  // --- Jogo ---
  function startGame() {
    if (state === 'playing') return;
    playerScore = 0;
    cpuScore = 0;
    updateScoreDisplay();
    hideOverlay();
    resetPositions();
    state = 'playing';
    if (!animId) loop();
  }

  function restartGame() {
    cancelAnimationFrame(animId);
    animId = null;
    playerScore = 0;
    cpuScore = 0;
    updateScoreDisplay();
    hideOverlay();
    resetPositions();
    state = 'playing';
    loop();
  }

  // --- Loop principal ---
  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  function update() {
    if (state !== 'playing' && state !== 'scored') return;

    if (state === 'scored') {
      flashTimer--;
      if (flashTimer <= 0) {
        state = 'playing';
        flashSide = null;
      }
      return;
    }

    // Mover jogador via teclado
    const moveSpeed = 5.5;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
      player.y = Math.max(0, player.y - moveSpeed);
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
      player.y = Math.min(CANVAS_H - PADDLE_H, player.y + moveSpeed);
    }

    // Touch: converter coordenada touch para espaço do canvas lógico
    if (touchCurrentY !== null) {
      const logicalY = touchCurrentY / scale;
      player.y = Math.max(0, Math.min(CANVAS_H - PADDLE_H, logicalY - PADDLE_H / 2));
    }

    // IA da CPU
    const cpuCenter = cpu.y + PADDLE_H / 2;
    const targetY   = ball.y * CPU_REACTION + (CANVAS_H / 2) * (1 - CPU_REACTION);
    if (cpuCenter < targetY - 4) {
      cpu.y = Math.min(CANVAS_H - PADDLE_H, cpu.y + CPU_SPEED);
    } else if (cpuCenter > targetY + 4) {
      cpu.y = Math.max(0, cpu.y - CPU_SPEED);
    }

    // Mover bola
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Rebate parede superior/inferior
    if (ball.y - BALL_SIZE <= 0) {
      ball.y = BALL_SIZE;
      ball.vy = Math.abs(ball.vy);
    }
    if (ball.y + BALL_SIZE >= CANVAS_H) {
      ball.y = CANVAS_H - BALL_SIZE;
      ball.vy = -Math.abs(ball.vy);
    }

    // Colisão com raquete do jogador
    if (
      ball.vx < 0 &&
      ball.x - BALL_SIZE <= player.x + player.w &&
      ball.x - BALL_SIZE >= player.x &&
      ball.y + BALL_SIZE >= player.y &&
      ball.y - BALL_SIZE <= player.y + player.h
    ) {
      bounceOffPaddle(player, 1);
    }

    // Colisão com raquete da CPU
    if (
      ball.vx > 0 &&
      ball.x + BALL_SIZE >= cpu.x &&
      ball.x + BALL_SIZE <= cpu.x + cpu.w &&
      ball.y + BALL_SIZE >= cpu.y &&
      ball.y - BALL_SIZE <= cpu.y + cpu.h
    ) {
      bounceOffPaddle(cpu, -1);
    }

    // Ponto para CPU (bola passou pela esquerda)
    if (ball.x - BALL_SIZE < 0) {
      cpuScore++;
      updateScoreDisplay();
      checkWin('cpu');
      return;
    }

    // Ponto para jogador (bola passou pela direita)
    if (ball.x + BALL_SIZE > CANVAS_W) {
      playerScore++;
      updateScoreDisplay();
      checkWin('player');
      return;
    }
  }

  function bounceOffPaddle(paddle, dirX) {
    const paddleCenter = paddle.y + paddle.h / 2;
    const hitOffset    = (ball.y - paddleCenter) / (paddle.h / 2); // -1 a +1
    const bounceAngle  = hitOffset * (Math.PI / 4); // max 45°

    ball.speed = Math.min(ball.speed + BALL_SPEED_INC, BALL_SPEED_MAX);
    ball.vx = dirX * ball.speed * Math.cos(bounceAngle);
    ball.vy = ball.speed * Math.sin(bounceAngle);

    // Evitar que a bola fique presa dentro da raquete
    if (dirX > 0) ball.x = paddle.x + paddle.w + BALL_SIZE + 1;
    else          ball.x = paddle.x - BALL_SIZE - 1;
  }

  function checkWin(scorer) {
    if (playerScore >= WIN_SCORE || cpuScore >= WIN_SCORE) {
      const playerWon = playerScore >= WIN_SCORE;
      if (playerWon) {
        wins++;
        const isNew = MiniJogos.saveHighScore('pong', wins);
        document.getElementById('highscore').textContent = wins;
        showOverlay(
          'Você venceu!',
          `Placar: ${playerScore} × ${cpuScore}${isNew ? ' — Novo recorde!' : ''}`,
          'Jogar de novo'
        );
      } else {
        showOverlay(
          'CPU venceu!',
          `Placar: ${playerScore} × ${cpuScore}`,
          'Tentar novamente'
        );
      }
      state = 'gameover';
      cancelAnimationFrame(animId);
      animId = null;
      draw(); // último frame
      return;
    }

    // Ponto marcado — pausa rápida e reset da bola
    flashSide = scorer;
    flashTimer = 45;
    state = 'scored';
    resetBall(scorer === 'player' ? 'cpu' : 'player'); // serve quem tomou o ponto
  }

  // --- Placar ---
  function updateScoreDisplay() {
    document.getElementById('playerScore').textContent = playerScore;
    document.getElementById('cpuScore').textContent    = cpuScore;
  }

  // --- Overlay ---
  function showOverlay(title, msg, btnText) {
    document.getElementById('overlayTitle').textContent = title;
    document.getElementById('overlayMsg').textContent   = msg;
    document.getElementById('overlayBtn').textContent   = btnText;
    document.getElementById('gameOverlay').classList.add('visible');
  }

  function hideOverlay() {
    document.getElementById('gameOverlay').classList.remove('visible');
  }

  // --- Desenho ---
  function draw() {
    ctx.save();
    ctx.scale(scale, scale);

    drawBackground();
    drawNet();
    drawFlashEffect();
    drawPaddle(player, COLOR_ELEMENT);
    drawPaddle(cpu, COLOR_ELEMENT);
    drawBall();
    drawScoreOnCanvas();

    ctx.restore();
  }

  function drawIdle() {
    ctx.save();
    ctx.scale(scale, scale);
    drawBackground();
    drawNet();
    drawPaddle(player, COLOR_ELEMENT);
    drawPaddle(cpu, COLOR_ELEMENT);
    drawBall();
    ctx.restore();
  }

  function drawBackground() {
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function drawNet() {
    ctx.save();
    ctx.strokeStyle = COLOR_NET;
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2, 0);
    ctx.lineTo(CANVAS_W / 2, CANVAS_H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawFlashEffect() {
    if (!flashSide || flashTimer <= 0) return;
    const alpha = (flashTimer / 45) * 0.18;
    if (flashSide === 'player') {
      ctx.fillStyle = `rgba(0, 229, 160, ${alpha})`; // accent verde
    } else {
      ctx.fillStyle = `rgba(255, 87, 87, ${alpha})`;  // danger vermelho
    }
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function drawPaddle(paddle, color) {
    ctx.fillStyle = color;
    roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 4);
    ctx.fill();
  }

  function drawBall() {
    // Rastro de movimento
    ctx.save();
    const trailLen = 4;
    for (let i = trailLen; i >= 1; i--) {
      const alpha = (1 - i / trailLen) * 0.25;
      ctx.fillStyle = `rgba(232, 232, 240, ${alpha})`;
      const tx = ball.x - (ball.vx * i * 0.6);
      const ty = ball.y - (ball.vy * i * 0.6);
      ctx.beginPath();
      ctx.arc(tx, ty, BALL_SIZE * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Bola principal
    ctx.fillStyle = COLOR_ELEMENT;
    ctx.shadowColor = 'rgba(232, 232, 240, 0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawScoreOnCanvas() {
    ctx.font = `bold 28px var(--font-mono, monospace)`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232, 232, 240, 0.15)';
    ctx.fillText(playerScore, CANVAS_W / 2 - 50, 44);
    ctx.fillText(cpuScore,    CANVAS_W / 2 + 50, 44);
  }

  // --- Util: rounded rect ---
  function roundRect(ctx, x, y, w, h, r) {
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

  // --- Touch ---
  function onTouchStart(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    touchStartY   = e.touches[0].clientY - rect.top;
    touchCurrentY = touchStartY;
    if (state === 'idle' || state === 'gameover') startGame();
  }

  function onTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    touchCurrentY = e.touches[0].clientY - rect.top;
  }

  function onTouchEnd(e) {
    e.preventDefault();
    touchStartY   = null;
    touchCurrentY = null;
  }

  // --- Start ---
  document.addEventListener('DOMContentLoaded', init);

})();
