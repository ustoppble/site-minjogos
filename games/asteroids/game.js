/* ============================================
   ASTEROIDS — Mini Jogos
   Jogo classico de nave espacial vs asteroides
   ============================================ */

const GAME_ID = 'asteroids';

const COLORS = {
  bg:             '#0f0f23',
  ship:           '#7c5cff',
  shipFill:       'rgba(124, 92, 255, 0.12)',
  shipThrust:     '#ffb347',
  bullet:         '#00e5a0',
  asteroidStroke: '#ff5757',
  asteroidFill:   'rgba(255, 87, 87, 0.07)',
  text:           '#e8e8f0',
  textMuted:      '#9999bb',
  particle:       ['#ff5757', '#ffb347', '#e8e8f0', '#7c5cff', '#00e5a0'],
};

const SHIP_CFG = {
  size:         15,   // half-length of ship body
  rotSpeed:     3.2,  // degrees per frame
  thrust:       0.22,
  friction:     0.978,
  maxSpeed:     7,
  bulletCooldown: 11,
  invincibleMs: 3000, // ms of invincibility on respawn
};

const ASTEROID_CFG = {
  radii:  [52, 28, 14],   // large, medium, small
  speeds: [0.9, 1.7, 2.8],
  points: [20,  50, 100],
  numVerts: 11,
  jaggedness: 0.42,
};

const BULLET_CFG = {
  speed:   8.5,
  maxLife: 58,
  radius:  2.5,
  max:     5,
};

// -------------------------------------------------------
// Particle
// -------------------------------------------------------
class Particle {
  constructor(x, y, colorOverride) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3.5 + 0.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = 0.022 + Math.random() * 0.028;
    this.size = Math.random() * 3 + 1;
    this.color = colorOverride || COLORS.particle[Math.floor(Math.random() * COLORS.particle.length)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  isDead() { return this.life <= 0; }
}

// -------------------------------------------------------
// FloatText — score pop shown above destroyed asteroid
// -------------------------------------------------------
class FloatText {
  constructor(x, y, text) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.life = 1.0;
    this.decay = 0.025;
  }

  update() {
    this.y -= 0.7;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = COLORS.bullet;
    ctx.font = 'bold 13px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }

  isDead() { return this.life <= 0; }
}

// -------------------------------------------------------
// Asteroid
// -------------------------------------------------------
class Asteroid {
  constructor(x, y, sizeIndex) {
    this.x = x;
    this.y = y;
    this.sizeIndex = sizeIndex; // 0=large 1=medium 2=small
    this.radius = ASTEROID_CFG.radii[sizeIndex];

    const baseSpeed = ASTEROID_CFG.speeds[sizeIndex];
    const angle = Math.random() * Math.PI * 2;
    const speedMult = 0.7 + Math.random() * 0.6;
    this.vx = Math.cos(angle) * baseSpeed * speedMult;
    this.vy = Math.sin(angle) * baseSpeed * speedMult;

    this.rotAngle = 0;
    this.rotSpeed = (Math.random() - 0.5) * 0.045;

    // Generate irregular polygon (fixed vertices, transformed each frame)
    const n = ASTEROID_CFG.numVerts + Math.floor(Math.random() * 4);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const jag = ASTEROID_CFG.jaggedness;
      const r = this.radius * (1 - jag + Math.random() * jag * 2);
      this.verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
  }

  update(W, H) {
    this.x += this.vx;
    this.y += this.vy;
    this.rotAngle += this.rotSpeed;

    // Screen wrap
    if (this.x < -this.radius) this.x = W + this.radius;
    else if (this.x > W + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = H + this.radius;
    else if (this.y > H + this.radius) this.y = -this.radius;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotAngle);

    ctx.beginPath();
    ctx.moveTo(this.verts[0].x, this.verts[0].y);
    for (let i = 1; i < this.verts.length; i++) {
      ctx.lineTo(this.verts[i].x, this.verts[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = COLORS.asteroidFill;
    ctx.fill();
    ctx.strokeStyle = COLORS.asteroidStroke;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.restore();
  }

  // Returns array of smaller asteroids when destroyed
  split() {
    if (this.sizeIndex >= 2) return [];
    const next = this.sizeIndex + 1;
    const a1 = new Asteroid(this.x, this.y, next);
    const a2 = new Asteroid(this.x, this.y, next);
    // Fly out perpendicular to parent velocity for classic feel
    const parentAngle = Math.atan2(this.vy, this.vx);
    const speed = ASTEROID_CFG.speeds[next] * (1 + Math.random() * 0.5);
    const spread = 0.6;
    a1.vx = Math.cos(parentAngle + spread) * speed;
    a1.vy = Math.sin(parentAngle + spread) * speed;
    a2.vx = Math.cos(parentAngle - spread) * speed;
    a2.vy = Math.sin(parentAngle - spread) * speed;
    return [a1, a2];
  }

  getPoints() { return ASTEROID_CFG.points[this.sizeIndex]; }
}

// -------------------------------------------------------
// Bullet
// -------------------------------------------------------
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * BULLET_CFG.speed;
    this.vy = Math.sin(angle) * BULLET_CFG.speed;
    this.life = BULLET_CFG.maxLife;
    this.radius = BULLET_CFG.radius;
  }

  update(W, H) {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;

    // Screen wrap
    if (this.x < 0) this.x = W;
    else if (this.x > W) this.x = 0;
    if (this.y < 0) this.y = H;
    else if (this.y > H) this.y = 0;
  }

  draw(ctx) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.bullet;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.bullet;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  isDead() { return this.life <= 0; }
}

// -------------------------------------------------------
// Ship
// -------------------------------------------------------
class Ship {
  constructor(x, y) {
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2; // pointing up
    this.thrusting = false;
    this.bulletCooldown = 0;
    this.alive = true;
    this.invincible = true;
    this.invincibleTimer = SHIP_CFG.invincibleMs;
    this._lastTime = performance.now();
  }

  update(keys, W, H, dt) {
    if (!this.alive) return;

    const ROT = (SHIP_CFG.rotSpeed * Math.PI) / 180;

    if (keys['ArrowLeft'] || keys['a'] || keys['A']) this.angle -= ROT;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) this.angle += ROT;

    this.thrusting = !!(keys['ArrowUp'] || keys['w'] || keys['W']);
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * SHIP_CFG.thrust;
      this.vy += Math.sin(this.angle) * SHIP_CFG.thrust;
    }

    // Friction + speed cap
    this.vx *= SHIP_CFG.friction;
    this.vy *= SHIP_CFG.friction;
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > SHIP_CFG.maxSpeed) {
      this.vx = (this.vx / spd) * SHIP_CFG.maxSpeed;
      this.vy = (this.vy / spd) * SHIP_CFG.maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Screen wrap
    if (this.x < 0) this.x = W;
    else if (this.x > W) this.x = 0;
    if (this.y < 0) this.y = H;
    else if (this.y > H) this.y = 0;

    if (this.bulletCooldown > 0) this.bulletCooldown--;

    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }
  }

  tryShoot() {
    if (!this.alive || this.bulletCooldown > 0) return null;
    this.bulletCooldown = SHIP_CFG.bulletCooldown;
    const tip = SHIP_CFG.size;
    return new Bullet(
      this.x + Math.cos(this.angle) * tip,
      this.y + Math.sin(this.angle) * tip,
      this.angle
    );
  }

  draw(ctx) {
    if (!this.alive) return;
    // Blink while invincible
    if (this.invincible && Math.floor(this.invincibleTimer / 120) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const s = SHIP_CFG.size;

    // Thrust flame (drawn behind ship)
    if (this.thrusting) {
      const flicker = 0.4 + Math.random() * 0.6;
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, s * 0.3);
      ctx.lineTo(-s * (0.9 + flicker * 0.6), 0);
      ctx.lineTo(-s * 0.45, -s * 0.3);
      ctx.fillStyle = COLORS.shipThrust;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Ship body — sleek triangle
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.65, s * 0.58);
    ctx.lineTo(-s * 0.38, 0);
    ctx.lineTo(-s * 0.65, -s * 0.58);
    ctx.closePath();

    ctx.fillStyle = COLORS.shipFill;
    ctx.fill();
    ctx.strokeStyle = COLORS.ship;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = COLORS.ship;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  get radius() { return 12; }
}

// -------------------------------------------------------
// AsteroidsGame — main controller
// -------------------------------------------------------
class AsteroidsGame {
  constructor() {
    this.canvas   = document.getElementById('gameCanvas');
    this.ctx      = this.canvas.getContext('2d');
    this.scoreEl  = document.getElementById('score');
    this.livesEl  = document.getElementById('lives');
    this.hsEl     = document.getElementById('highscore');
    this.overlay  = document.getElementById('gameOverlay');
    this.finalEl  = document.getElementById('finalScore');

    this.score      = 0;
    this.lives      = 3;
    this.level      = 1;
    this.isRunning  = false;
    this.animId     = null;
    this.keys       = {};
    this.lastTs     = 0;

    this.ship       = null;
    this.asteroids  = [];
    this.bullets    = [];
    this.particles  = [];
    this.floatTexts = [];

    this.inTransition     = false;
    this.transitionTimer  = 0;
    this.levelFlash       = null; // { text, life }

    // Static starfield (relative coords 0-1)
    this.stars = Array.from({ length: 80 }, () => ({
      rx: Math.random(),
      ry: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.55 + 0.15,
    }));

    this._setupInput();
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._drawIdle();

    // Show saved high score immediately
    this._updateUI();
  }

  // ---- Setup ----

  _resize() {
    MiniJogos.resizeCanvas(this.canvas, 800, 800 / 600);
    if (!this.isRunning) this._drawIdle();
  }

  _setupInput() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === ' ' && this.isRunning) {
        this._fireBullet();
      }
    });
    document.addEventListener('keyup', (e) => { this.keys[e.key] = false; });

    this._setupTouchControls();
  }

  _setupTouchControls() {
    const held = (id, key) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const on  = (e) => { e.preventDefault(); this.keys[key] = true; };
      const off = (e) => { e.preventDefault(); this.keys[key] = false; };
      btn.addEventListener('touchstart',  on,  { passive: false });
      btn.addEventListener('touchend',    off, { passive: false });
      btn.addEventListener('touchcancel', off, { passive: false });
      btn.addEventListener('mousedown',   on);
      btn.addEventListener('mouseup',     off);
      btn.addEventListener('mouseleave',  off);
    };

    held('btnLeft',   'ArrowLeft');
    held('btnRight',  'ArrowRight');
    held('btnThrust', 'ArrowUp');

    const fireBtn = document.getElementById('btnFire');
    if (fireBtn) {
      const fireDown = (e) => {
        e.preventDefault();
        if (this.isRunning) this._fireBullet();
      };
      fireBtn.addEventListener('touchstart', fireDown, { passive: false });
      fireBtn.addEventListener('mousedown',  fireDown);
    }
  }

  _fireBullet() {
    if (!this.ship || this.bullets.length >= BULLET_CFG.max) return;
    const b = this.ship.tryShoot();
    if (b) this.bullets.push(b);
  }

  // ---- Spawning ----

  _spawnAsteroids(count) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const MIN_DIST = 160;

    for (let i = 0; i < count; i++) {
      let x, y;
      let attempts = 0;
      do {
        x = Math.random() * W;
        y = Math.random() * H;
        attempts++;
      } while (Math.hypot(x - cx, y - cy) < MIN_DIST && attempts < 50);
      this.asteroids.push(new Asteroid(x, y, 0));
    }
  }

  _spawnParticles(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  // ---- Game flow ----

  start() {
    if (this.animId) cancelAnimationFrame(this.animId);

    this.score          = 0;
    this.lives          = 3;
    this.level          = 1;
    this.bullets        = [];
    this.particles      = [];
    this.floatTexts     = [];
    this.keys           = {};
    this.inTransition   = false;
    this.transitionTimer = 0;
    this.levelFlash     = null;

    const W = this.canvas.width;
    const H = this.canvas.height;
    this.ship = new Ship(W / 2, H / 2);

    this.asteroids = [];
    this._spawnAsteroids(3);

    this.isRunning = true;
    if (this.overlay) this.overlay.hidden = true;

    this._updateUI();
    this.lastTs = performance.now();
    this._loop(this.lastTs);
  }

  restart() {
    if (this.overlay) this.overlay.hidden = true;
    this.start();
  }

  _loop(ts) {
    if (!this.isRunning) return;
    const dt = Math.min(ts - this.lastTs, 50); // cap at 50ms
    this.lastTs = ts;
    this._update(dt);
    this._draw();
    this.animId = requestAnimationFrame((t) => this._loop(t));
  }

  // ---- Update ----

  _update(dt) {
    const W = this.canvas.width;
    const H = this.canvas.height;

    this.ship?.update(this.keys, W, H, dt);

    this.bullets = this.bullets.filter(b => !b.isDead());
    this.bullets.forEach(b => b.update(W, H));

    this.asteroids.forEach(a => a.update(W, H));

    this.particles = this.particles.filter(p => !p.isDead());
    this.particles.forEach(p => p.update());

    this.floatTexts = this.floatTexts.filter(f => !f.isDead());
    this.floatTexts.forEach(f => f.update());

    if (this.levelFlash) {
      this.levelFlash.life -= 0.018;
      if (this.levelFlash.life <= 0) this.levelFlash = null;
    }

    this._checkBulletAsteroid();
    this._checkShipAsteroid();
    this._checkLevelComplete();
  }

  _checkBulletAsteroid() {
    const hitBullets = new Set();
    const newAsteroids = [];

    this.asteroids = this.asteroids.filter(ast => {
      for (let i = 0; i < this.bullets.length; i++) {
        if (hitBullets.has(i)) continue;
        const b = this.bullets[i];
        if (Math.hypot(b.x - ast.x, b.y - ast.y) < b.radius + ast.radius) {
          hitBullets.add(i);
          this._addScore(ast.getPoints());
          this._spawnParticles(ast.x, ast.y, 9);
          this.floatTexts.push(new FloatText(ast.x, ast.y - 12, `+${ast.getPoints()}`));
          newAsteroids.push(...ast.split());
          return false;
        }
      }
      return true;
    });

    this.bullets = this.bullets.filter((_, i) => !hitBullets.has(i));
    this.asteroids.push(...newAsteroids);
  }

  _checkShipAsteroid() {
    if (!this.ship || !this.ship.alive || this.ship.invincible) return;
    for (const ast of this.asteroids) {
      if (Math.hypot(this.ship.x - ast.x, this.ship.y - ast.y) < this.ship.radius + ast.radius * 0.8) {
        this._loseLife();
        return;
      }
    }
  }

  _checkLevelComplete() {
    if (this.asteroids.length > 0 || this.inTransition) return;

    this.inTransition   = true;
    this.transitionTimer = 100;
    this.level++;
    this.levelFlash = { text: `Nivel ${this.level}`, life: 1.0 };

    if (this.ship) {
      this.ship.invincible      = true;
      this.ship.invincibleTimer = SHIP_CFG.invincibleMs;
    }
  }

  // Check if transition countdown has ended → spawn next wave
  _maybeNextWave() {
    if (!this.inTransition) return;
    this.transitionTimer--;
    if (this.transitionTimer <= 0) {
      this.inTransition = false;
      this._spawnAsteroids(2 + this.level);
    }
  }

  _loseLife() {
    this.lives--;
    this._spawnParticles(this.ship.x, this.ship.y, 18, COLORS.ship);
    this._updateUI();

    if (this.lives <= 0) {
      this.ship.alive = false;
      this._endGame();
    } else {
      const W = this.canvas.width;
      const H = this.canvas.height;
      this.ship.reset(W / 2, H / 2);
    }
  }

  _addScore(pts) {
    this.score += pts;
    this._updateUI();
  }

  _updateUI() {
    if (this.scoreEl) this.scoreEl.textContent = MiniJogos.formatScore(this.score);
    if (this.livesEl) this.livesEl.textContent = String(this.lives);
    if (this.hsEl)    this.hsEl.textContent    = MiniJogos.formatScore(MiniJogos.getHighScore(GAME_ID));
  }

  _endGame() {
    this.isRunning = false;
    MiniJogos.saveHighScore(GAME_ID, this.score);
    this._updateUI();

    if (this.overlay)  this.overlay.hidden = false;
    if (this.finalEl)  this.finalEl.textContent = MiniJogos.formatScore(this.score);
  }

  // ---- Draw ----

  _drawIdle() {
    const { ctx, canvas } = this;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this._drawStars();
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '15px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Clique em "Iniciar" para jogar', canvas.width / 2, canvas.height / 2);
  }

  _drawStars() {
    const { ctx, canvas } = this;
    ctx.fillStyle = '#ffffff';
    this.stars.forEach(s => {
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.rx * canvas.width, s.ry * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  _draw() {
    const { ctx, canvas } = this;

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this._drawStars();

    // Particles (behind everything else)
    this.particles.forEach(p => p.draw(ctx));

    // Asteroids
    this.asteroids.forEach(a => a.draw(ctx));

    // Bullets
    this.bullets.forEach(b => b.draw(ctx));

    // Ship
    this.ship?.draw(ctx);

    // Float texts
    this.floatTexts.forEach(f => f.draw(ctx));

    // Level flash
    if (this.levelFlash && this.levelFlash.life > 0) {
      ctx.globalAlpha = Math.min(1, this.levelFlash.life * 2);
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 32px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = COLORS.ship;
      ctx.fillText(this.levelFlash.text, canvas.width / 2, canvas.height / 2);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Level transition countdown (also updates state)
    this._maybeNextWave();
  }
}

// -------------------------------------------------------
// Init
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const game = new AsteroidsGame();

  document.getElementById('startBtn')?.addEventListener('click', () => game.start());
  document.getElementById('restartBtn')?.addEventListener('click', () => game.restart());
  document.getElementById('playAgainBtn')?.addEventListener('click', () => game.restart());
});
