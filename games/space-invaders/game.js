/* ============================================
   SPACE INVADERS — Mini Jogos
   Jogo completo com Canvas HTML5
   ============================================ */

(function () {
  'use strict';

  // --- Constantes ---
  const CANVAS_WIDTH  = 480;
  const CANVAS_HEIGHT = 560;

  const COLOR_BG       = '#0f0f23';
  const COLOR_TEXT     = '#e8e8f0';
  const COLOR_MUTED    = '#9999bb';
  const COLOR_PRIMARY  = '#7c5cff';
  const COLOR_ACCENT   = '#00e5a0';
  const COLOR_DANGER   = '#ff5757';
  const COLOR_WARNING  = '#ffb347';
  const COLOR_SURFACE  = '#1a1a3e';
  const COLOR_BORDER   = '#3a3a6a';

  // Nave do jogador
  const SHIP_WIDTH     = 40;
  const SHIP_HEIGHT    = 24;
  const SHIP_SPEED     = 5;
  const SHIP_Y_OFFSET  = 40;

  // Projeteis
  const BULLET_WIDTH   = 3;
  const BULLET_HEIGHT  = 14;
  const BULLET_SPEED   = 7;
  const BULLET_COOLDOWN = 15; // frames entre tiros

  // Aliens
  const ALIEN_COLS     = 8;
  const ALIEN_ROWS     = 4;
  const ALIEN_WIDTH    = 32;
  const ALIEN_HEIGHT   = 24;
  const ALIEN_GAP_X    = 12;
  const ALIEN_GAP_Y    = 14;
  const ALIEN_TOP_OFFSET = 60;
  const ALIEN_SPEED_INITIAL = 0.6;
  const ALIEN_DROP_DISTANCE = 18;
  const ALIEN_SHOOT_CHANCE  = 0.003; // por alien por frame

  // Projeteis dos aliens
  const ALIEN_BULLET_WIDTH  = 3;
  const ALIEN_BULLET_HEIGHT = 10;
  const ALIEN_BULLET_SPEED  = 3.5;

  // Pontos por fileira (topo = mais pontos)
  const ROW_CONFIG = [
    { points: 40, color: COLOR_DANGER },
    { points: 30, color: COLOR_WARNING },
    { points: 20, color: COLOR_ACCENT },
    { points: 10, color: COLOR_PRIMARY },
  ];

  // --- Estado do Jogo ---
  let state = 'idle'; // idle | running | over | win
  let score = 0;
  let lives = 3;
  let level = 1;
  let animFrameId = null;

  // Nave
  let ship = { x: 0, y: 0, width: SHIP_WIDTH, height: SHIP_HEIGHT };

  // Projeteis do jogador
  let bullets = [];
  let bulletCooldown = 0;

  // Aliens
  let aliens = [];
  let alienDirection = 1; // 1 = direita, -1 = esquerda
  let alienSpeed = ALIEN_SPEED_INITIAL;
  let totalAliens = 0;
  let aliveAliens = 0;

  // Projeteis dos aliens
  let alienBullets = [];

  // Particulas de explosao
  let particles = [];

  // Estrelas de fundo
  let stars = [];

  // --- Elementos DOM ---
  const canvas       = document.getElementById('gameCanvas');
  const ctx          = canvas.getContext('2d');
  const scoreEl      = document.getElementById('score');
  const livesEl      = document.getElementById('lives');
  const highscoreEl  = document.getElementById('highscore');
  const overlay      = document.getElementById('gameOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMsg   = document.getElementById('overlayMsg');
  const overlayBtn   = document.getElementById('overlayBtn');
  const startBtn     = document.getElementById('startBtn');
  const restartBtn   = document.getElementById('restartBtn');

  // --- Setup Canvas ---
  function setupCanvas() {
    canvas.width  = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }

  // --- Estrelas de fundo ---
  function initStars() {
    stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        alpha: Math.random() * 0.6 + 0.2,
      });
    }
  }

  function updateStars() {
    for (let i = 0; i < stars.length; i++) {
      stars[i].y += stars[i].speed;
      if (stars[i].y > CANVAS_HEIGHT) {
        stars[i].y = 0;
        stars[i].x = Math.random() * CANVAS_WIDTH;
      }
      // Cintilacao sutil
      stars[i].alpha += (Math.random() - 0.5) * 0.05;
      if (stars[i].alpha < 0.1) stars[i].alpha = 0.1;
      if (stars[i].alpha > 0.8) stars[i].alpha = 0.8;
    }
  }

  function drawStars() {
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      ctx.fillStyle = 'rgba(232, 232, 240, ' + s.alpha + ')';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
  }

  // --- Inicializacao ---
  function initGame() {
    score = 0;
    lives = 3;
    level = 1;
    bullets = [];
    alienBullets = [];
    particles = [];
    bulletCooldown = 0;

    updateScoreDisplay();
    updateLivesDisplay();
    updateHighscoreDisplay();

    initShip();
    initAliens();
    initStars();
  }

  function initShip() {
    ship.x = CANVAS_WIDTH / 2 - SHIP_WIDTH / 2;
    ship.y = CANVAS_HEIGHT - SHIP_Y_OFFSET;
  }

  function initAliens() {
    aliens = [];
    alienDirection = 1;
    alienSpeed = ALIEN_SPEED_INITIAL + (level - 1) * 0.15;
    aliveAliens = 0;

    const gridWidth = ALIEN_COLS * (ALIEN_WIDTH + ALIEN_GAP_X) - ALIEN_GAP_X;
    const startX = (CANVAS_WIDTH - gridWidth) / 2;

    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        aliens.push({
          x: startX + col * (ALIEN_WIDTH + ALIEN_GAP_X),
          y: ALIEN_TOP_OFFSET + row * (ALIEN_HEIGHT + ALIEN_GAP_Y),
          width: ALIEN_WIDTH,
          height: ALIEN_HEIGHT,
          row: row,
          col: col,
          alive: true,
          points: ROW_CONFIG[row].points,
          color: ROW_CONFIG[row].color,
          // Animacao: frame para sprite alternado
          frame: 0,
        });
        aliveAliens++;
      }
    }
    totalAliens = aliveAliens;
  }

  // --- Alien sprite desenhado com formas geometricas ---
  function drawAlien(alien) {
    const cx = alien.x + alien.width / 2;
    const cy = alien.y + alien.height / 2;
    const w = alien.width;
    const h = alien.height;
    const color = alien.color;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    if (alien.row === 0) {
      // Tipo 1: Invasor classico — forma de coroa
      drawAlienType1(cx, cy, w, h, color, alien.frame);
    } else if (alien.row === 1) {
      // Tipo 2: Invasor redondo com antenas
      drawAlienType2(cx, cy, w, h, color, alien.frame);
    } else if (alien.row === 2) {
      // Tipo 3: Invasor angular/diamante
      drawAlienType3(cx, cy, w, h, color, alien.frame);
    } else {
      // Tipo 4: Invasor quadrado pixel
      drawAlienType4(cx, cy, w, h, color, alien.frame);
    }

    ctx.restore();
  }

  function drawAlienType1(cx, cy, w, h, color, frame) {
    // Corpo principal — retangulo com "chifres"
    const bw = w * 0.6;
    const bh = h * 0.5;
    ctx.fillStyle = color;

    // Corpo
    ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);

    // Chifres
    ctx.fillRect(cx - bw / 2 - 4, cy - bh / 2 - 5, 5, 8);
    ctx.fillRect(cx + bw / 2 - 1, cy - bh / 2 - 5, 5, 8);

    // Pernas alternando com frame
    const legOffset = frame % 2 === 0 ? 2 : -2;
    ctx.fillRect(cx - bw / 2 + 2, cy + bh / 2, 4, 5 + legOffset);
    ctx.fillRect(cx + bw / 2 - 6, cy + bh / 2, 4, 5 - legOffset);
    ctx.fillRect(cx - 2, cy + bh / 2, 4, 3);

    // Olhos
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(cx - 5, cy - 3, 4, 4);
    ctx.fillRect(cx + 2, cy - 3, 4, 4);
  }

  function drawAlienType2(cx, cy, w, h, color, frame) {
    ctx.fillStyle = color;

    // Corpo arredondado
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Antenas
    const antAngle = frame % 2 === 0 ? 0.3 : -0.3;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - w * 0.28);
    ctx.lineTo(cx - 10 + antAngle * 4, cy - w * 0.28 - 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - w * 0.28);
    ctx.lineTo(cx + 10 - antAngle * 4, cy - w * 0.28 - 8);
    ctx.stroke();

    // Bolinha na ponta das antenas
    ctx.beginPath();
    ctx.arc(cx - 10 + antAngle * 4, cy - w * 0.28 - 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 10 - antAngle * 4, cy - w * 0.28 - 8, 2, 0, Math.PI * 2);
    ctx.fill();

    // Pernas
    const legSpread = frame % 2 === 0 ? 3 : -3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + w * 0.28);
    ctx.lineTo(cx - 8 - legSpread, cy + w * 0.28 + 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy + w * 0.28);
    ctx.lineTo(cx + 8 + legSpread, cy + w * 0.28 + 7);
    ctx.stroke();

    // Olhos
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(cx - 5, cy - 3, 3, 4);
    ctx.fillRect(cx + 2, cy - 3, 3, 4);
  }

  function drawAlienType3(cx, cy, w, h, color, frame) {
    ctx.fillStyle = color;

    // Corpo hexagonal / diamante
    const hw = w * 0.38;
    const hh = h * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy - hh * 0.3);
    ctx.lineTo(cx + hw, cy + hh * 0.3);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy + hh * 0.3);
    ctx.lineTo(cx - hw, cy - hh * 0.3);
    ctx.closePath();
    ctx.fill();

    // Asas laterais que mexem
    const wingExtend = frame % 2 === 0 ? 6 : 3;
    ctx.fillRect(cx - hw - wingExtend, cy - 3, wingExtend, 6);
    ctx.fillRect(cx + hw, cy - 3, wingExtend, 6);

    // Olhos
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(cx - 4, cy - 3, 3, 3);
    ctx.fillRect(cx + 2, cy - 3, 3, 3);
  }

  function drawAlienType4(cx, cy, w, h, color, frame) {
    ctx.fillStyle = color;

    // Corpo quadrado pixel art
    const size = Math.min(w, h) * 0.35;
    ctx.fillRect(cx - size, cy - size, size * 2, size * 2);

    // Orelhas
    ctx.fillRect(cx - size - 3, cy - size - 3, 5, 6);
    ctx.fillRect(cx + size - 2, cy - size - 3, 5, 6);

    // Pernas
    const legDist = frame % 2 === 0 ? 2 : -1;
    ctx.fillRect(cx - size + 2, cy + size, 4, 4 + legDist);
    ctx.fillRect(cx + size - 6, cy + size, 4, 4 - legDist);

    // Olhos
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(cx - 4, cy - 3, 3, 4);
    ctx.fillRect(cx + 2, cy - 3, 3, 4);

    // Boca
    ctx.fillRect(cx - 3, cy + 3, 6, 2);
  }

  // --- Nave do jogador ---
  function drawShip() {
    const sx = ship.x;
    const sy = ship.y;
    const sw = ship.width;
    const sh = ship.height;

    ctx.save();
    ctx.shadowColor = COLOR_PRIMARY;
    ctx.shadowBlur = 12;

    // Corpo principal — triangulo/nave
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    grad.addColorStop(0, '#9b7fff');
    grad.addColorStop(1, COLOR_PRIMARY);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(sx + sw / 2, sy);                  // Ponta
    ctx.lineTo(sx + sw, sy + sh);                  // Base direita
    ctx.lineTo(sx + sw * 0.7, sy + sh * 0.7);     // Entalhe direito
    ctx.lineTo(sx + sw * 0.3, sy + sh * 0.7);     // Entalhe esquerdo
    ctx.lineTo(sx, sy + sh);                       // Base esquerda
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Cabine — circulo pequeno brilhante
    ctx.fillStyle = COLOR_ACCENT;
    ctx.beginPath();
    ctx.arc(sx + sw / 2, sy + sh * 0.4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Brilho
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(sx + sw / 2, sy + 2);
    ctx.lineTo(sx + sw * 0.6, sy + sh * 0.35);
    ctx.lineTo(sx + sw * 0.4, sy + sh * 0.35);
    ctx.closePath();
    ctx.fill();

    // Propulsao (chama)
    if (state === 'running') {
      const flameH = 6 + Math.random() * 6;
      const flameGrad = ctx.createLinearGradient(
        sx + sw / 2, sy + sh * 0.7,
        sx + sw / 2, sy + sh * 0.7 + flameH
      );
      flameGrad.addColorStop(0, 'rgba(255, 183, 71, 0.9)');
      flameGrad.addColorStop(0.5, 'rgba(255, 87, 87, 0.6)');
      flameGrad.addColorStop(1, 'rgba(255, 87, 87, 0)');
      ctx.fillStyle = flameGrad;

      ctx.beginPath();
      ctx.moveTo(sx + sw * 0.38, sy + sh * 0.7);
      ctx.lineTo(sx + sw / 2, sy + sh * 0.7 + flameH);
      ctx.lineTo(sx + sw * 0.62, sy + sh * 0.7);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- Update ---
  function update() {
    if (state !== 'running') return;

    updateStars();
    updateShip();
    updateBullets();
    updateAliens();
    updateAlienBullets();
    updateParticles();
    checkCollisions();

    if (bulletCooldown > 0) bulletCooldown--;
  }

  function updateShip() {
    if (keys.ArrowLeft || keys.a) ship.x -= SHIP_SPEED;
    if (keys.ArrowRight || keys.d) ship.x += SHIP_SPEED;

    ship.x = Math.max(0, Math.min(CANVAS_WIDTH - ship.width, ship.x));
  }

  function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= BULLET_SPEED;
      if (bullets[i].y + BULLET_HEIGHT < 0) {
        bullets.splice(i, 1);
      }
    }
  }

  function updateAliens() {
    // Atualizar frame de animacao (mais lento)
    if (animFrameId % 30 === 0) {
      for (let i = 0; i < aliens.length; i++) {
        if (aliens[i].alive) aliens[i].frame++;
      }
    }

    // Verificar se algum alien bateu na borda
    let shouldDrop = false;
    let minX = CANVAS_WIDTH;
    let maxX = 0;

    for (let i = 0; i < aliens.length; i++) {
      if (!aliens[i].alive) continue;
      if (aliens[i].x < minX) minX = aliens[i].x;
      if (aliens[i].x + aliens[i].width > maxX) maxX = aliens[i].x + aliens[i].width;
    }

    if (alienDirection === 1 && maxX >= CANVAS_WIDTH - 10) {
      shouldDrop = true;
      alienDirection = -1;
    } else if (alienDirection === -1 && minX <= 10) {
      shouldDrop = true;
      alienDirection = 1;
    }

    // Velocidade aumenta conforme aliens morrem
    const speedMultiplier = 1 + (totalAliens - aliveAliens) / totalAliens * 2.5;
    const currentSpeed = alienSpeed * speedMultiplier;

    for (let i = 0; i < aliens.length; i++) {
      if (!aliens[i].alive) continue;

      if (shouldDrop) {
        aliens[i].y += ALIEN_DROP_DISTANCE;
      }
      aliens[i].x += alienDirection * currentSpeed;

      // Aliens atiram
      if (Math.random() < ALIEN_SHOOT_CHANCE * (1 + level * 0.2)) {
        // So atirar se for o alien mais abaixo na sua coluna
        if (isBottomAlien(aliens[i])) {
          alienBullets.push({
            x: aliens[i].x + aliens[i].width / 2 - ALIEN_BULLET_WIDTH / 2,
            y: aliens[i].y + aliens[i].height,
            width: ALIEN_BULLET_WIDTH,
            height: ALIEN_BULLET_HEIGHT,
          });
        }
      }

      // Aliens chegaram na nave = game over
      if (aliens[i].y + aliens[i].height >= ship.y) {
        gameOver();
        return;
      }
    }
  }

  function isBottomAlien(alien) {
    for (let i = 0; i < aliens.length; i++) {
      if (!aliens[i].alive) continue;
      if (aliens[i].col === alien.col && aliens[i].row > alien.row) {
        return false;
      }
    }
    return true;
  }

  function updateAlienBullets() {
    for (let i = alienBullets.length - 1; i >= 0; i--) {
      alienBullets[i].y += ALIEN_BULLET_SPEED;
      if (alienBullets[i].y > CANVAS_HEIGHT) {
        alienBullets.splice(i, 1);
      }
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.dx;
      p.y += p.dy;
      p.life--;
      p.alpha = p.life / p.maxLife;
      p.size *= 0.96;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // --- Tiro ---
  function shoot() {
    if (state !== 'running') return;
    if (bulletCooldown > 0) return;

    bullets.push({
      x: ship.x + ship.width / 2 - BULLET_WIDTH / 2,
      y: ship.y - BULLET_HEIGHT,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
    });
    bulletCooldown = BULLET_COOLDOWN;
  }

  // --- Colisoes ---
  function checkCollisions() {
    // Projeteis do jogador vs aliens
    for (let b = bullets.length - 1; b >= 0; b--) {
      const bullet = bullets[b];
      let hit = false;

      for (let a = 0; a < aliens.length; a++) {
        const alien = aliens[a];
        if (!alien.alive) continue;

        if (
          bullet.x < alien.x + alien.width &&
          bullet.x + bullet.width > alien.x &&
          bullet.y < alien.y + alien.height &&
          bullet.y + bullet.height > alien.y
        ) {
          // Hit!
          alien.alive = false;
          aliveAliens--;
          hit = true;

          score += alien.points;
          updateScoreDisplay();

          // Explosao
          spawnExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, alien.color);

          // Todos mortos? Proximo nivel
          if (aliveAliens <= 0) {
            nextLevel();
            return;
          }
          break;
        }
      }

      if (hit) {
        bullets.splice(b, 1);
      }
    }

    // Projeteis dos aliens vs nave
    for (let i = alienBullets.length - 1; i >= 0; i--) {
      const ab = alienBullets[i];

      if (
        ab.x < ship.x + ship.width &&
        ab.x + ab.width > ship.x &&
        ab.y < ship.y + ship.height &&
        ab.y + ab.height > ship.y
      ) {
        alienBullets.splice(i, 1);
        lives--;
        updateLivesDisplay();

        // Explosao na nave
        spawnExplosion(ship.x + ship.width / 2, ship.y + ship.height / 2, COLOR_PRIMARY);

        if (lives <= 0) {
          gameOver();
          return;
        }

        // Resetar posicao
        initShip();
        bullets = [];
        alienBullets = [];
        bulletCooldown = 30;
      }
    }
  }

  // --- Explosoes ---
  function spawnExplosion(x, y, color) {
    const count = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      const maxLife = 20 + Math.floor(Math.random() * 15);
      particles.push({
        x: x,
        y: y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: color,
        life: maxLife,
        maxLife: maxLife,
        alpha: 1,
      });
    }
  }

  // --- Proximo nivel ---
  function nextLevel() {
    level++;
    bullets = [];
    alienBullets = [];
    particles = [];
    bulletCooldown = 30;
    initAliens();
    initShip();
  }

  // --- Render ---
  function render() {
    // Fundo
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Estrelas
    drawStars();

    // HUD — nivel e vidas no canvas
    drawHUD();

    // Aliens
    for (let i = 0; i < aliens.length; i++) {
      if (aliens[i].alive) drawAlien(aliens[i]);
    }

    // Projeteis do jogador
    drawBullets();

    // Projeteis dos aliens
    drawAlienBullets();

    // Nave
    drawShip();

    // Particulas
    drawParticles();
  }

  function drawHUD() {
    // Nivel
    ctx.fillStyle = COLOR_MUTED;
    ctx.font = '12px "JetBrains Mono", "Fira Code", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('NIVEL ' + level, 10, 20);

    // Vidas como naves pequenas
    ctx.textAlign = 'right';
    ctx.fillStyle = COLOR_MUTED;
    ctx.fillText('VIDAS', CANVAS_WIDTH - 10, 20);

    for (let i = 0; i < lives; i++) {
      const lx = CANVAS_WIDTH - 18 - i * 22;
      const ly = 26;
      ctx.fillStyle = COLOR_PRIMARY;
      ctx.beginPath();
      ctx.moveTo(lx + 6, ly);
      ctx.lineTo(lx + 12, ly + 10);
      ctx.lineTo(lx, ly + 10);
      ctx.closePath();
      ctx.fill();
    }

    // Linha separadora
    ctx.strokeStyle = COLOR_BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 42);
    ctx.lineTo(CANVAS_WIDTH, 42);
    ctx.stroke();
  }

  function drawBullets() {
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];

      // Glow
      ctx.save();
      ctx.shadowColor = COLOR_ACCENT;
      ctx.shadowBlur = 8;
      ctx.fillStyle = COLOR_ACCENT;
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.restore();

      // Centro brilhante
      ctx.fillStyle = '#fff';
      ctx.fillRect(b.x + 0.5, b.y + 1, b.width - 1, b.height - 2);
    }
  }

  function drawAlienBullets() {
    for (let i = 0; i < alienBullets.length; i++) {
      const ab = alienBullets[i];

      ctx.save();
      ctx.shadowColor = COLOR_DANGER;
      ctx.shadowBlur = 6;
      ctx.fillStyle = COLOR_DANGER;
      ctx.fillRect(ab.x, ab.y, ab.width, ab.height);
      ctx.restore();

      // Centro
      ctx.fillStyle = COLOR_WARNING;
      ctx.fillRect(ab.x + 0.5, ab.y + 1, ab.width - 1, ab.height - 2);
    }
  }

  function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // --- Loop principal ---
  let frameCount = 0;

  function gameLoop() {
    frameCount++;
    // Reuse frameCount for alien animation instead of animFrameId
    if (frameCount % 30 === 0) {
      for (let i = 0; i < aliens.length; i++) {
        if (aliens[i].alive) aliens[i].frame++;
      }
    }

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
    frameCount = 0;
    gameLoop();
  }

  function restartGame() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    state = 'idle';
    startGame();
  }

  function gameOver() {
    state = 'over';
    MiniJogos.saveHighScore('space-invaders', score);
    updateHighscoreDisplay();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    showOverlay('Game Over', 'Pontuacao final: ' + MiniJogos.formatScore(score), 'Jogar Novamente');
  }

  function winGame() {
    state = 'win';
    MiniJogos.saveHighScore('space-invaders', score);
    updateHighscoreDisplay();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    showOverlay('Voce Venceu!', 'Pontuacao: ' + MiniJogos.formatScore(score), 'Jogar Novamente');
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
      highscoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('space-invaders'));
    }
  }

  // --- Teclado ---
  const keys = {};

  document.addEventListener('keydown', function (e) {
    keys[e.key] = true;
    keys[e.code] = true;

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (state === 'running') {
        shoot();
      } else if (state === 'idle' || state === 'over' || state === 'win') {
        startGame();
      }
    }

    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && state === 'running') {
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
    keys[e.code] = false;
  });

  // --- Touch ---
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (state !== 'running') return;

    var touch = e.touches[0];
    var rect  = canvas.getBoundingClientRect();
    var touchX = (touch.clientX - rect.left) / rect.width;

    if (touchX < 0.33) {
      // Esquerda: mover para a esquerda
      keys.ArrowLeft = true;
      keys.ArrowRight = false;
    } else if (touchX > 0.66) {
      // Direita: mover para a direita
      keys.ArrowRight = true;
      keys.ArrowLeft = false;
    } else {
      // Centro: atirar
      shoot();
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (state !== 'running') return;

    var touch = e.touches[0];
    var rect  = canvas.getBoundingClientRect();
    var touchX = (touch.clientX - rect.left) / rect.width;

    keys.ArrowLeft = false;
    keys.ArrowRight = false;

    if (touchX < 0.33) {
      keys.ArrowLeft = true;
    } else if (touchX > 0.66) {
      keys.ArrowRight = true;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  }, { passive: false });

  // --- Botoes ---
  startBtn.addEventListener('click', function () {
    if (state === 'idle' || state === 'over' || state === 'win') {
      startGame();
    }
  });

  restartBtn.addEventListener('click', function () {
    restartGame();
  });

  overlayBtn.addEventListener('click', function () {
    startGame();
  });

  // --- Render inicial (tela idle) ---
  function renderIdle() {
    setupCanvas();
    initStars();
    initAliens();
    initShip();

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawStars();
    drawHUD();

    for (var i = 0; i < aliens.length; i++) {
      if (aliens[i].alive) drawAlien(aliens[i]);
    }

    drawShip();
    showOverlay('Space Invaders', 'Defenda a Terra dos invasores espaciais!', 'Iniciar');
  }

  // --- Fix: remove animFrameId usage for alien frames ---
  // The updateAliens function was referencing animFrameId % 30 for frame animation.
  // We already moved this logic to gameLoop using frameCount, so remove the
  // duplicate check in updateAliens.

  // Override updateAliens to remove the frame animation block (already handled in gameLoop)
  var originalUpdateAliens = updateAliens;
  updateAliens = function () {
    // Verificar se algum alien bateu na borda
    var shouldDrop = false;
    var minX = CANVAS_WIDTH;
    var maxX = 0;

    for (var i = 0; i < aliens.length; i++) {
      if (!aliens[i].alive) continue;
      if (aliens[i].x < minX) minX = aliens[i].x;
      if (aliens[i].x + aliens[i].width > maxX) maxX = aliens[i].x + aliens[i].width;
    }

    if (alienDirection === 1 && maxX >= CANVAS_WIDTH - 10) {
      shouldDrop = true;
      alienDirection = -1;
    } else if (alienDirection === -1 && minX <= 10) {
      shouldDrop = true;
      alienDirection = 1;
    }

    // Velocidade aumenta conforme aliens morrem
    var speedMultiplier = 1 + (totalAliens - aliveAliens) / totalAliens * 2.5;
    var currentSpeed = alienSpeed * speedMultiplier;

    for (var i = 0; i < aliens.length; i++) {
      if (!aliens[i].alive) continue;

      if (shouldDrop) {
        aliens[i].y += ALIEN_DROP_DISTANCE;
      }
      aliens[i].x += alienDirection * currentSpeed;

      // Aliens atiram
      if (Math.random() < ALIEN_SHOOT_CHANCE * (1 + level * 0.2)) {
        if (isBottomAlien(aliens[i])) {
          alienBullets.push({
            x: aliens[i].x + aliens[i].width / 2 - ALIEN_BULLET_WIDTH / 2,
            y: aliens[i].y + aliens[i].height,
            width: ALIEN_BULLET_WIDTH,
            height: ALIEN_BULLET_HEIGHT,
          });
        }
      }

      // Aliens chegaram na nave = game over
      if (aliens[i].y + aliens[i].height >= ship.y) {
        gameOver();
        return;
      }
    }
  };

  // --- Boot ---
  setupCanvas();
  updateHighscoreDisplay();
  renderIdle();

})();
