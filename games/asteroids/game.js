/* ============================================
   ASTEROIDS — Mini Jogos
   Nave espacial, asteroides e tiros. Classico!
   ============================================ */

class AsteroidsGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = document.getElementById('score');
    this.gameOverlay = document.getElementById('gameOverlay');
    this.finalScoreEl = document.getElementById('finalScore');

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.isRunning = false;
    this.animationId = null;
    this.gameId = 'asteroids';

    this.ship = null;
    this.asteroids = [];
    this.bullets = [];
    this.particles = [];
    this.stars = [];

    this.keys = {};
    this.lastShotTime = 0;
    this.SHOT_COOLDOWN = 260; // ms
    this.invincibleFrames = 0;
    this.lastTime = 0;

    this.W = 0;
    this.H = 0;

    this.resize();
    this.setupInput();
    window.addEventListener('resize', () => this.resize());
  }

  // ── Resize ──────────────────────────────────────────────────────────────

  resize() {
    const { width, height } = MiniJogos.resizeCanvas(this.canvas, 700, 4 / 3);
    this.W = width;
    this.H = height;
    this.generateStars();
    if (!this.isRunning) this.drawIdle();
  }

  generateStars() {
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: (Math.abs(Math.sin(i * 127.1 + 0.5)) ) * this.W,
        y: (Math.abs(Math.sin(i * 311.7 + 1.3)) ) * this.H,
        r: 0.4 + Math.abs(Math.sin(i * 53.1)) * 1.2,
        a: 0.15 + Math.abs(Math.sin(i * 89.1)) * 0.55,
      });
    }
  }

  // ── Tela Idle ────────────────────────────────────────────────────────────

  drawIdle() {
    const { ctx, W, H } = this;
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, W, H);
    this.drawStarField();

    ctx.strokeStyle = '#9999bb';
    ctx.lineWidth = 1.5;
    this.drawAsteroidShape(ctx, W * 0.18, H * 0.36, Math.min(W, H) * 0.07, 9,
      [0.8, 1.0, 0.7, 0.9, 1.1, 0.75, 0.95, 0.85, 1.0], 0);
    this.drawAsteroidShape(ctx, W * 0.80, H * 0.27, Math.min(W, H) * 0.05, 8,
      [0.9, 0.75, 1.0, 0.8, 1.1, 0.7, 0.9, 0.85], 0.4);
    this.drawAsteroidShape(ctx, W * 0.68, H * 0.74, Math.min(W, H) * 0.032, 7,
      [0.85, 1.0, 0.7, 0.95, 0.8, 1.1, 0.9], 1.1);

    ctx.fillStyle = '#e8e8f0';
    ctx.font = `bold ${Math.max(18, Math.floor(H * 0.065))}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('ASTEROIDS', W / 2, H * 0.4);

    ctx.fillStyle = '#9999bb';
    ctx.font = `${Math.max(12, Math.floor(H * 0.032))}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText('Clique em "Iniciar" para jogar', W / 2, H * 0.52);
  }

  drawAsteroidShape(ctx, x, y, r, sides, offsets, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const rad = r * offsets[i % offsets.length];
      const px = Math.cos(angle) * rad;
      const py = Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(153,153,187,0.07)';
    ctx.fill();
    ctx.restore();
  }

  // ── Input ────────────────────────────────────────────────────────────────

  setupInput() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        this.tryShoot();
      }
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    this.setupTouchControls();
  }

  setupTouchControls() {
    const existing = document.getElementById('asteroids-touch');
    if (existing) existing.remove();

    const wrapper = this.canvas.closest('.game-canvas-wrapper');
    if (!wrapper) return;

    const touchUI = document.createElement('div');
    touchUI.id = 'asteroids-touch';
    touchUI.className = 'asteroids-touch';
    touchUI.setAttribute('aria-hidden', 'true');
    touchUI.innerHTML = `
      <div class="asteroids-touch-row">
        <button class="asteroids-btn" id="ast-left" aria-label="Girar esquerda">&#9664;</button>
        <button class="asteroids-btn asteroids-btn-thrust" id="ast-thrust" aria-label="Acelerar">&#9650;</button>
        <button class="asteroids-btn" id="ast-right" aria-label="Girar direita">&#9654;</button>
      </div>
      <button class="asteroids-btn asteroids-btn-shoot" id="ast-shoot" aria-label="Atirar">&#9679; Atirar</button>
    `;
    wrapper.insertAdjacentElement('afterend', touchUI);

    // Direction buttons
    const dirMap = { 'ast-left': 'Touch_left', 'ast-right': 'Touch_right', 'ast-thrust': 'Touch_thrust' };
    for (const [id, key] of Object.entries(dirMap)) {
      const btn = document.getElementById(id);
      if (!btn) continue;
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[key] = true; }, { passive: false });
      btn.addEventListener('touchend',   (e) => { e.preventDefault(); this.keys[key] = false; }, { passive: false });
      btn.addEventListener('touchcancel',(e) => { e.preventDefault(); this.keys[key] = false; }, { passive: false });
      btn.addEventListener('mousedown', () => this.keys[key] = true);
      btn.addEventListener('mouseup',   () => this.keys[key] = false);
      btn.addEventListener('mouseleave',() => this.keys[key] = false);
    }

    // Shoot button
    const shootBtn = document.getElementById('ast-shoot');
    if (shootBtn) {
      shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.tryShoot(); }, { passive: false });
      shootBtn.addEventListener('mousedown', () => this.tryShoot());
    }
  }

  // ── Factory ──────────────────────────────────────────────────────────────

  createShip() {
    return {
      x: this.W / 2,
      y: this.H / 2,
      angle: -Math.PI / 2,    // apontando para cima
      vx: 0,
      vy: 0,
      size: Math.max(10, Math.min(this.W, this.H) * 0.026),
      thrusting: false,
    };
  }

  createAsteroid(x, y, size, speedMult) {
    const angle = Math.random() * Math.PI * 2;
    const baseSpeed = size === 'large' ? 1.0 : size === 'medium' ? 1.7 : 2.6;
    const speed = (baseSpeed + Math.random() * baseSpeed) * (speedMult || 1);
    const sides = 7 + Math.floor(Math.random() * 4);
    const offsets = Array.from({ length: sides }, () => 0.62 + Math.random() * 0.5);
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      sides,
      offsets,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.022,
    };
  }

  getAsteroidRadius(size) {
    const base = Math.min(this.W, this.H);
    if (size === 'large')  return base * 0.068;
    if (size === 'medium') return base * 0.038;
    return base * 0.021;
  }

  spawnAsteroids() {
    const count = 3 + this.level;
    this.asteroids = [];
    const safeR = Math.min(this.W, this.H) * 0.22;
    const speedMult = 1 + (this.level - 1) * 0.14;

    for (let i = 0; i < count; i++) {
      let x, y, attempts = 0;
      do {
        x = Math.random() * this.W;
        y = Math.random() * this.H;
        attempts++;
      } while (Math.hypot(x - this.W / 2, y - this.H / 2) < safeR && attempts < 25);
      this.asteroids.push(this.createAsteroid(x, y, 'large', speedMult));
    }
  }

  // ── Tiro ─────────────────────────────────────────────────────────────────

  tryShoot() {
    if (!this.isRunning || !this.ship) return;
    const now = Date.now();
    if (now - this.lastShotTime < this.SHOT_COOLDOWN) return;
    this.lastShotTime = now;

    const { ship } = this;
    const BULLET_SPEED = 9.5;
    this.bullets.push({
      x: ship.x + Math.cos(ship.angle) * ship.size * 1.6,
      y: ship.y + Math.sin(ship.angle) * ship.size * 1.6,
      vx: ship.vx * 0.25 + Math.cos(ship.angle) * BULLET_SPEED,
      vy: ship.vy * 0.25 + Math.sin(ship.angle) * BULLET_SPEED,
      life: 52,
      maxLife: 52,
    });
  }

  // ── Ciclo de jogo ────────────────────────────────────────────────────────

  start() {
    if (this.animationId) cancelAnimationFrame(this.animationId);

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.bullets = [];
    this.particles = [];
    this.ship = this.createShip();
    this.invincibleFrames = 0;
    this.spawnAsteroids();
    this.updateScore();

    if (this.gameOverlay) this.gameOverlay.hidden = true;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame((ts) => this.loop(ts));
  }

  loop(timestamp) {
    if (!this.isRunning) return;
    const rawDt = (timestamp - this.lastTime) / 16.667;
    const dt = Math.min(rawDt, 3);
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame((ts) => this.loop(ts));
  }

  // ── Update ───────────────────────────────────────────────────────────────

  update(dt) {
    const { ship, keys } = this;

    if (this.invincibleFrames > 0) this.invincibleFrames -= dt;

    // Rotacao
    const rotSpeed = 0.056 * dt;
    if (keys['ArrowLeft']  || keys['KeyA'] || keys['Touch_left'])  ship.angle -= rotSpeed;
    if (keys['ArrowRight'] || keys['KeyD'] || keys['Touch_right']) ship.angle += rotSpeed;

    // Impulso
    ship.thrusting = !!(keys['ArrowUp'] || keys['KeyW'] || keys['Touch_thrust']);
    if (ship.thrusting) {
      ship.vx += Math.cos(ship.angle) * 0.19 * dt;
      ship.vy += Math.sin(ship.angle) * 0.19 * dt;
    }

    // Arrasto + limite de velocidade
    const drag = Math.pow(0.987, dt);
    ship.vx *= drag;
    ship.vy *= drag;
    const spd = Math.hypot(ship.vx, ship.vy);
    if (spd > 7) {
      ship.vx = (ship.vx / spd) * 7;
      ship.vy = (ship.vy / spd) * 7;
    }

    // Mover nave (teletransporte nas bordas)
    ship.x = ((ship.x + ship.vx * dt) % this.W + this.W) % this.W;
    ship.y = ((ship.y + ship.vy * dt) % this.H + this.H) % this.H;

    // Atualizar balas
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x = ((b.x + b.vx * dt) % this.W + this.W) % this.W;
      b.y = ((b.y + b.vy * dt) % this.H + this.H) % this.H;
      b.life -= dt;
      if (b.life <= 0) this.bullets.splice(i, 1);
    }

    // Atualizar asteroides
    for (const ast of this.asteroids) {
      ast.x = ((ast.x + ast.vx * dt) % this.W + this.W) % this.W;
      ast.y = ((ast.y + ast.vy * dt) % this.H + this.H) % this.H;
      ast.angle += ast.spin * dt;
    }

    // Atualizar particulas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.965, dt);
      p.vy *= Math.pow(0.965, dt);
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Colisao bala-asteroide
    this.checkBulletCollisions();

    // Colisao nave-asteroide
    if (this.invincibleFrames <= 0) {
      this.checkShipCollision();
    }

    // Proximo nivel
    if (this.asteroids.length === 0) {
      this.level++;
      this.bullets = [];
      this.spawnAsteroids();
    }
  }

  checkBulletCollisions() {
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      let hit = false;

      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const ast = this.asteroids[ai];
        if (Math.hypot(b.x - ast.x, b.y - ast.y) < this.getAsteroidRadius(ast.size) * 0.88) {
          // Pontuacao
          const pts = ast.size === 'large' ? 20 : ast.size === 'medium' ? 50 : 100;
          this.score += pts;
          this.updateScore();

          // Explosao
          this.spawnExplosion(ast.x, ast.y, ast.size);

          // Fragmentar
          const sm = 1 + (this.level - 1) * 0.14;
          if (ast.size === 'large') {
            this.asteroids.push(
              this.createAsteroid(ast.x, ast.y, 'medium', sm),
              this.createAsteroid(ast.x, ast.y, 'medium', sm)
            );
          } else if (ast.size === 'medium') {
            this.asteroids.push(
              this.createAsteroid(ast.x, ast.y, 'small', sm),
              this.createAsteroid(ast.x, ast.y, 'small', sm)
            );
          }

          this.asteroids.splice(ai, 1);
          hit = true;
          break;
        }
      }

      if (hit) this.bullets.splice(bi, 1);
    }
  }

  checkShipCollision() {
    const { ship } = this;
    const shipR = ship.size * 0.72;

    for (const ast of this.asteroids) {
      if (Math.hypot(ship.x - ast.x, ship.y - ast.y) < shipR + this.getAsteroidRadius(ast.size) * 0.72) {
        this.lives--;
        this.spawnExplosion(ship.x, ship.y, 'ship');

        if (this.lives <= 0) {
          this.triggerGameOver();
          return;
        }

        // Renascer no centro
        ship.x = this.W / 2;
        ship.y = this.H / 2;
        ship.vx = 0;
        ship.vy = 0;
        ship.angle = -Math.PI / 2;
        this.invincibleFrames = 180; // ~3s a 60fps
        break;
      }
    }
  }

  // ── Particulas ───────────────────────────────────────────────────────────

  spawnExplosion(x, y, type) {
    let colors, count;
    if (type === 'ship') {
      colors = ['#ff5757', '#ffb347', '#e8e8f0'];
      count = 26;
    } else if (type === 'large') {
      colors = ['#9999bb', '#b8b8d0', '#7c5cff'];
      count = 22;
    } else if (type === 'medium') {
      colors = ['#00e5a0', '#9999bb', '#7c5cff'];
      count = 14;
    } else {
      colors = ['#00e5a0', '#ffb347'];
      count = 9;
    }

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 3.8;
      const life = 16 + Math.random() * 24;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1.2 + Math.random() * 2.2,
      });
    }
  }

  // ── Desenho ──────────────────────────────────────────────────────────────

  draw() {
    const { ctx, W, H } = this;

    // Fundo
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, W, H);

    this.drawStarField();

    // Asteroides
    for (const ast of this.asteroids) {
      this.drawAsteroid(ast);
    }

    // Balas
    for (const b of this.bullets) {
      const alpha = Math.min(1, b.life / 8);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = '#00e5a0';
      ctx.shadowBlur = 7;
      ctx.fillStyle = '#00e5a0';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Nave (pisca quando invencivel)
    const showShip = this.invincibleFrames <= 0 || Math.floor(this.invincibleFrames / 7) % 2 === 0;
    if (showShip) this.drawShip();

    // Particulas
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // HUD
    this.drawHUD();
  }

  drawStarField() {
    const { ctx } = this;
    for (const s of this.stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawShip() {
    const { ctx, ship } = this;
    const s = ship.size;

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    // Chama do propulsor
    if (ship.thrusting) {
      const fLen = s * (1.1 + Math.random() * 0.7);
      ctx.save();
      ctx.globalAlpha = 0.65 + Math.random() * 0.35;
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = s * 0.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ffb347';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, 0);
      ctx.lineTo(-s * 0.55 - fLen, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Corpo triangular
    ctx.beginPath();
    ctx.moveTo(s * 1.55, 0);         // ponta
    ctx.lineTo(-s, -s * 0.68);       // asa esquerda
    ctx.lineTo(-s * 0.42, 0);        // centro traseiro
    ctx.lineTo(-s, s * 0.68);        // asa direita
    ctx.closePath();

    ctx.fillStyle = 'rgba(124,92,255,0.15)';
    ctx.fill();

    ctx.strokeStyle = '#7c5cff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#7c5cff';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  drawAsteroid(ast) {
    const { ctx } = this;
    const r = this.getAsteroidRadius(ast.size);

    ctx.save();
    ctx.translate(ast.x, ast.y);
    ctx.rotate(ast.angle);

    ctx.beginPath();
    for (let i = 0; i < ast.sides; i++) {
      const angle = (i / ast.sides) * Math.PI * 2;
      const radius = r * ast.offsets[i];
      if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else         ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();

    const fill = ast.size === 'large' ? 'rgba(153,153,187,0.08)'
               : ast.size === 'medium' ? 'rgba(153,153,187,0.1)'
               : 'rgba(184,184,208,0.13)';
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = ast.size === 'large' ? '#9999bb'
                    : ast.size === 'medium' ? '#b8b8d0'
                    : '#d0d0e8';
    ctx.lineWidth = ast.size === 'small' ? 1 : 1.5;
    ctx.stroke();

    ctx.restore();
  }

  drawHUD() {
    const { ctx, W, H } = this;
    const fSize = Math.max(12, Math.floor(H * 0.028));

    // Vidas (mini naves)
    const s = Math.max(7, Math.floor(H * 0.019));
    for (let i = 0; i < this.lives; i++) {
      const lx = 14 + i * (s * 3.2 + 5);
      const ly = 14 + s;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(-Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(s * 1.55, 0);
      ctx.lineTo(-s, -s * 0.68);
      ctx.lineTo(-s * 0.42, 0);
      ctx.lineTo(-s, s * 0.68);
      ctx.closePath();
      ctx.strokeStyle = '#7c5cff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Nivel
    ctx.fillStyle = '#9999bb';
    ctx.font = `${fSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`Nível ${this.level}`, W - 12, fSize + 12);
    ctx.textAlign = 'left';
  }

  // ── Score / Game Over ────────────────────────────────────────────────────

  updateScore() {
    if (this.scoreEl) {
      this.scoreEl.textContent = MiniJogos.formatScore(this.score);
    }
  }

  triggerGameOver() {
    this.isRunning = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.draw();

    MiniJogos.saveHighScore(this.gameId, this.score);
    const high = MiniJogos.getHighScore(this.gameId);
    const isRecord = this.score > 0 && this.score >= high;

    if (this.finalScoreEl) {
      this.finalScoreEl.textContent = MiniJogos.formatScore(this.score) + ' pts' + (isRecord ? '  \uD83C\uDFC6' : '');
    }
    if (this.gameOverlay) this.gameOverlay.hidden = false;
  }

  restart() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.start();
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const game = new AsteroidsGame('gameCanvas');

  document.getElementById('startBtn')?.addEventListener('click',    () => game.start());
  document.getElementById('restartBtn')?.addEventListener('click',  () => game.restart());
  document.getElementById('playAgainBtn')?.addEventListener('click',() => game.restart());
});
