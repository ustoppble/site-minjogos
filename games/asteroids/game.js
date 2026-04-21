/* ============================================
   ASTEROIDS — Mini Jogos
   ============================================ */

class AsteroidsGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = document.getElementById('score');
    this.highScoreEl = document.getElementById('highScore');
    this.gameOverlay = document.getElementById('gameOverlay');
    this.finalScoreEl = document.getElementById('finalScore');

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.isRunning = false;
    this.animationId = null;
    this.idleAnimId = null;

    this.ship = null;
    this.asteroids = [];
    this.bullets = [];
    this.particles = [];
    this.stars = [];
    this.idleAsteroids = [];

    this.keys = {};
    this.touchKeys = {};
    this.shootCooldown = 0;
    this.invincibleTimer = 0;
    this.levelUpTimer = 0;
    this.lastTime = 0;
    this.W = 0;
    this.H = 0;

    this.resize();
    this.setupInput();
    this.setupTouchControls();
    window.addEventListener('resize', () => this.resize());

    this.showHighScore();
    this.startIdleAnimation();
  }

  resize() {
    const dims = MiniJogos.resizeCanvas(this.canvas, 800, 4 / 3);
    this.W = dims.width;
    this.H = dims.height;
    this.generateStars();
    if (!this.isRunning) this.createIdleAsteroids();
  }

  generateStars() {
    const count = Math.floor((this.W * this.H) / 3500);
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * this.W,
      y: Math.random() * this.H,
      r: Math.random() * 1.2 + 0.3,
      a: 0.3 + Math.random() * 0.7,
    }));
  }

  createIdleAsteroids() {
    this.idleAsteroids = [];
    const sizes = ['large', 'large', 'medium', 'medium', 'small'];
    for (let i = 0; i < 5; i++) {
      const a = this.createAsteroid(Math.random() * this.W, Math.random() * this.H, sizes[i]);
      this.idleAsteroids.push(a);
    }
  }

  startIdleAnimation() {
    const tick = () => {
      if (this.isRunning) return;
      this.drawIdleFrame();
      this.idleAnimId = requestAnimationFrame(tick);
    };
    this.idleAnimId = requestAnimationFrame(tick);
  }

  drawIdleFrame() {
    const { ctx } = this;

    for (const a of this.idleAsteroids) {
      a.x = (a.x + a.vx * 0.5 + this.W) % this.W;
      a.y = (a.y + a.vy * 0.5 + this.H) % this.H;
      a.rotation += a.rotSpeed * 0.5;
    }

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, this.W, this.H);
    this.drawStars();

    for (const a of this.idleAsteroids) {
      this.drawAsteroid(a, 0.35);
    }

    const s = Math.min(1, this.W / 520);

    ctx.save();
    ctx.translate(this.W / 2, this.H / 2 - 58 * s);
    ctx.scale(s * 1.6, s * 1.6);
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#7c5cff';
    ctx.strokeStyle = '#7c5cff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -10);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 22;
    ctx.shadowColor = '#7c5cff';
    ctx.fillStyle = '#e8e8f0';
    ctx.font = `bold ${Math.round(28 * s)}px 'IBM Plex Mono', monospace`;
    ctx.fillText('ASTEROIDS', this.W / 2, this.H / 2 + 8 * s);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#9999bb';
    ctx.font = `${Math.round(13 * s)}px 'IBM Plex Mono', monospace`;
    ctx.fillText('Pressione "Iniciar" para jogar', this.W / 2, this.H / 2 + 44 * s);
    ctx.textBaseline = 'alphabetic';
  }

  drawStars() {
    const { ctx } = this;
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  createShip() {
    return {
      x: this.W / 2,
      y: this.H / 2,
      angle: -Math.PI / 2,
      vx: 0,
      vy: 0,
      radius: 14,
      thrusting: false,
    };
  }

  createAsteroid(x, y, size) {
    const radii = { large: 38, medium: 22, small: 11 };
    const baseSpeeds = { large: [0.8, 0.6], medium: [1.3, 0.9], small: [2.0, 1.3] };
    const [base, rnd] = baseSpeeds[size];
    const speed = (base + Math.random() * rnd) * (1 + (this.level - 1) * 0.08);
    const angle = Math.random() * Math.PI * 2;
    const radius = radii[size];
    const numVerts = 8 + Math.floor(Math.random() * 5);
    const verts = Array.from({ length: numVerts }, (_, i) => {
      const a = (i / numVerts) * Math.PI * 2;
      const r = radius * (0.65 + Math.random() * 0.7);
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });

    return {
      x, y, size, radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      verts,
    };
  }

  spawnAsteroids() {
    const count = 3 + this.level;
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = Math.random() * this.W;
        y = Math.random() * this.H;
      } while (Math.hypot(x - this.W / 2, y - this.H / 2) < 130);
      this.asteroids.push(this.createAsteroid(x, y, 'large'));
    }
  }

  start() {
    if (this.idleAnimId) {
      cancelAnimationFrame(this.idleAnimId);
      this.idleAnimId = null;
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.asteroids = [];
    this.bullets = [];
    this.particles = [];
    this.shootCooldown = 0;
    this.invincibleTimer = 120;
    this.levelUpTimer = 0;
    this.ship = this.createShip();
    this.spawnAsteroids();
    this.updateScore();

    if (this.gameOverlay) this.gameOverlay.hidden = true;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  loop() {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.667, 3);
    this.lastTime = now;
    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    const { ship } = this;

    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.levelUpTimer > 0) this.levelUpTimer -= dt;

    const left = this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchKeys['left'];
    const right = this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchKeys['right'];
    const thrust = this.keys['ArrowUp'] || this.keys['KeyW'] || this.touchKeys['thrust'];
    const shoot = this.keys['Space'] || this.touchKeys['shoot'];

    if (left) ship.angle -= 0.055 * dt;
    if (right) ship.angle += 0.055 * dt;

    ship.thrusting = !!thrust;
    if (thrust) {
      ship.vx += Math.cos(ship.angle) * 0.2 * dt;
      ship.vy += Math.sin(ship.angle) * 0.2 * dt;
    }

    const drag = Math.pow(0.988, dt);
    ship.vx *= drag;
    ship.vy *= drag;

    const spd = Math.hypot(ship.vx, ship.vy);
    if (spd > 9) {
      ship.vx = (ship.vx / spd) * 9;
      ship.vy = (ship.vy / spd) * 9;
    }

    ship.x = (ship.x + ship.vx * dt + this.W) % this.W;
    ship.y = (ship.y + ship.vy * dt + this.H) % this.H;

    if (shoot && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = 9;
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x = (b.x + b.vx * dt + this.W) % this.W;
      b.y = (b.y + b.vy * dt + this.H) % this.H;
      b.life -= dt;
      if (b.life <= 0) this.bullets.splice(i, 1);
    }

    for (const a of this.asteroids) {
      a.x = (a.x + a.vx * dt + this.W) % this.W;
      a.y = (a.y + a.vy * dt + this.H) % this.H;
      a.rotation += a.rotSpeed * dt;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.97, dt);
      p.vy *= Math.pow(0.97, dt);
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Bullet-asteroid collisions
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      let hit = false;
      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const a = this.asteroids[ai];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.radius + 2) {
          this.bullets.splice(bi, 1);
          this.explodeAsteroid(ai);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    if (this.invincibleTimer <= 0) {
      for (const a of this.asteroids) {
        if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.radius + ship.radius - 6) {
          this.shipHit();
          break;
        }
      }
    }

    if (this.asteroids.length === 0) {
      this.level++;
      this.score += this.level * 200;
      this.updateScore();
      this.levelUpTimer = 90;
      this.spawnAsteroids();
      this.invincibleTimer = 90;
      this.spawnLevelParticles();
    }
  }

  shoot() {
    const { ship } = this;
    this.bullets.push({
      x: ship.x + Math.cos(ship.angle) * 18,
      y: ship.y + Math.sin(ship.angle) * 18,
      vx: ship.vx + Math.cos(ship.angle) * 11,
      vy: ship.vy + Math.sin(ship.angle) * 11,
      life: 55,
    });
  }

  explodeAsteroid(index) {
    const a = this.asteroids[index];
    const pts = { large: 20, medium: 50, small: 100 };
    this.score += pts[a.size];
    this.updateScore();

    const count = a.size === 'large' ? 18 : a.size === 'medium' ? 12 : 8;
    const colors = ['#ff5757', '#ffb347', '#e8e8f0', '#9999bb'];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        x: a.x, y: a.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 20,
        maxLife: 45,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1.5 + Math.random() * 2.5,
      });
    }

    if (a.size === 'large') {
      for (let i = 0; i < 2; i++) this.asteroids.push(this.createAsteroid(a.x, a.y, 'medium'));
    } else if (a.size === 'medium') {
      for (let i = 0; i < 2; i++) this.asteroids.push(this.createAsteroid(a.x, a.y, 'small'));
    }

    this.asteroids.splice(index, 1);
  }

  shipHit() {
    this.lives--;

    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1 + Math.random() * 5;
      this.particles.push({
        x: this.ship.x, y: this.ship.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 40,
        maxLife: 80,
        color: i % 2 === 0 ? '#ff5757' : '#ffb347',
        size: 2 + Math.random() * 4,
      });
    }

    if (this.lives <= 0) {
      this.doGameOver();
      return;
    }

    this.ship.x = this.W / 2;
    this.ship.y = this.H / 2;
    this.ship.vx = 0;
    this.ship.vy = 0;
    this.invincibleTimer = 150;
  }

  spawnLevelParticles() {
    const cx = this.W / 2, cy = this.H / 2;
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const dist = 30 + Math.random() * 120;
      const speed = 0.5 + Math.random() * 2.5;
      this.particles.push({
        x: cx + Math.cos(angle) * dist * 0.2,
        y: cy + Math.sin(angle) * dist * 0.2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 50 + Math.random() * 50,
        maxLife: 100,
        color: i % 2 === 0 ? '#00e5a0' : '#7c5cff',
        size: 2 + Math.random() * 3,
      });
    }
  }

  doGameOver() {
    this.isRunning = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    MiniJogos.saveHighScore('asteroids', this.score);
    this.showHighScore();
    this.draw();

    if (this.gameOverlay) {
      this.gameOverlay.hidden = false;
      if (this.finalScoreEl) this.finalScoreEl.textContent = MiniJogos.formatScore(this.score);
    }
  }

  draw() {
    const { ctx } = this;

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, this.W, this.H);
    this.drawStars();

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const a of this.asteroids) {
      this.drawAsteroid(a, 1);
    }

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00e5a0';
    ctx.fillStyle = '#00e5a0';
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    if (this.invincibleTimer <= 0 || Math.floor(this.invincibleTimer / 5) % 2 === 0) {
      this.drawShip();
    }

    this.drawHUD();

    if (this.levelUpTimer > 0) {
      const alpha = Math.min(1, this.levelUpTimer / 30);
      const s = Math.min(1, this.W / 600);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#00e5a0';
      ctx.fillStyle = '#00e5a0';
      ctx.font = `bold ${Math.round(22 * s)}px 'IBM Plex Mono', monospace`;
      ctx.fillText(`NIVEL ${this.level}`, this.W / 2, this.H / 2);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
    }
  }

  drawAsteroid(a, alpha) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);
    ctx.strokeStyle = '#9999bb';
    ctx.fillStyle = 'rgba(153, 153, 187, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.verts[0].x, a.verts[0].y);
    for (let i = 1; i < a.verts.length; i++) {
      ctx.lineTo(a.verts[i].x, a.verts[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawShip() {
    const { ctx, ship } = this;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    ctx.shadowBlur = 14;
    ctx.shadowColor = '#7c5cff';
    ctx.strokeStyle = '#7c5cff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -10);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (ship.thrusting) {
      const flameLen = 8 + Math.random() * 10;
      ctx.strokeStyle = '#ffb347';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff8000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-7, -5);
      ctx.lineTo(-7 - flameLen, 0);
      ctx.lineTo(-7, 5);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  drawHUD() {
    const { ctx } = this;
    const scale = Math.min(1, this.W / 450);
    const fs = Math.round(12 * scale);

    ctx.font = `${fs}px 'IBM Plex Mono', monospace`;
    ctx.textBaseline = 'top';

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff5757';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ff5757';
    ctx.fillText('♥ '.repeat(Math.max(0, this.lives)).trim() || '', 10, 10);
    ctx.shadowBlur = 0;

    ctx.textAlign = 'right';
    ctx.fillStyle = '#9999bb';
    ctx.fillText(`NIV ${this.level}`, this.W - 10, 10);

    ctx.textBaseline = 'alphabetic';
  }

  updateScore() {
    if (this.scoreEl) {
      this.scoreEl.textContent = MiniJogos.formatScore(this.score);
    }
  }

  showHighScore() {
    if (this.highScoreEl) {
      this.highScoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('asteroids'));
    }
  }

  setupInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }

  setupTouchControls() {
    const map = {
      touchLeft: 'left',
      touchRight: 'right',
      touchThrust: 'thrust',
      touchShoot: 'shoot',
    };
    for (const [id, key] of Object.entries(map)) {
      const btn = document.getElementById(id);
      if (!btn) continue;
      const press = e => { e.preventDefault(); this.touchKeys[key] = true; };
      const release = e => { e.preventDefault(); this.touchKeys[key] = false; };
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new AsteroidsGame();
  document.getElementById('startBtn')?.addEventListener('click', () => game.start());
  document.getElementById('restartBtn')?.addEventListener('click', () => game.start());
  document.getElementById('playAgainBtn')?.addEventListener('click', () => game.start());
});
