'use strict';

class AsteroidsGame {
  constructor() {
    this.canvas    = document.getElementById('gameCanvas');
    this.ctx       = this.canvas.getContext('2d');
    this.scoreEl   = document.getElementById('score');
    this.highScoreEl = document.getElementById('highScore');
    this.livesEl   = document.getElementById('lives');
    this.overlayEl = document.getElementById('gameOverlay');
    this.overlayTitleEl = document.getElementById('overlayTitle');
    this.finalScoreEl   = document.getElementById('finalScore');

    this.score     = 0;
    this.lives     = 3;
    this.isRunning = false;
    this.animId    = null;
    this.lastTime  = 0;

    this.ship      = null;
    this.bullets   = [];
    this.asteroids = [];
    this.particles = [];
    this.popups    = [];

    this.invincible  = 0;
    this.wave        = 0;
    this.fireCooldown = 0;
    this._deathTimer = null;
    this._stars      = null;

    this.keys  = {};
    this.touch = { left: false, right: false, thrust: false, fire: false };

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._setupKeyboard();
    this._setupTouchControls();

    if (this.highScoreEl) {
      this.highScoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('asteroids'));
    }
  }

  // ── RESIZE ──────────────────────────────────────────────────────────────────
  _resize() {
    const d = MiniJogos.resizeCanvas(this.canvas, 720, 4 / 3);
    this.W = d.width;
    this.H = d.height;
    this._stars = null;
    if (!this.isRunning) this._drawIdle();
  }

  // ── INPUT ────────────────────────────────────────────────────────────────────
  _setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  _setupTouchControls() {
    const wrapper = this.canvas.closest('.game-canvas-wrapper') || this.canvas.parentElement;
    const bar = document.createElement('div');
    bar.className = 'touch-controls-bar';
    bar.setAttribute('aria-label', 'Controles de toque');
    bar.innerHTML = `
      <div class="touch-group">
        <button class="touch-btn" id="tcLeft"  aria-label="Girar esquerda">&#8592;</button>
        <button class="touch-btn" id="tcRight" aria-label="Girar direita">&#8594;</button>
      </div>
      <div class="touch-group">
        <button class="touch-btn touch-thrust" id="tcThrust" aria-label="Acelerar">&#9650;</button>
        <button class="touch-btn touch-fire"   id="tcFire"   aria-label="Atirar">&#9679;</button>
      </div>
    `;
    wrapper.after(bar);

    const bind = (id, prop) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on  = (e) => { e.preventDefault(); this.touch[prop] = true;  };
      const off = (e) => { e.preventDefault(); this.touch[prop] = false; };
      el.addEventListener('touchstart',  on,  { passive: false });
      el.addEventListener('touchend',    off, { passive: false });
      el.addEventListener('touchcancel', off);
    };

    bind('tcLeft',   'left');
    bind('tcRight',  'right');
    bind('tcThrust', 'thrust');
    bind('tcFire',   'fire');
  }

  // ── FACTORIES ────────────────────────────────────────────────────────────────
  _makeShip() {
    return {
      x: this.W / 2,
      y: this.H / 2,
      angle: -Math.PI / 2,
      vx: 0,
      vy: 0,
      thrusting: false,
    };
  }

  _makeAsteroid(x, y, tier) {
    const scale = Math.min(this.W, this.H);
    const cfg = {
      large:  { radius: 0.065, baseSpeed: 0.55, pts: 20  },
      medium: { radius: 0.038, baseSpeed: 1.05, pts: 50  },
      small:  { radius: 0.020, baseSpeed: 1.90, pts: 100 },
    }[tier];
    const spd   = cfg.baseSpeed * (scale / 500) * (0.8 + Math.random() * 0.4);
    const angle = Math.random() * Math.PI * 2;
    const nv    = 9 + Math.floor(Math.random() * 5);
    return {
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      tier,
      radius: cfg.radius * scale,
      pts:    cfg.pts,
      verts:  Array.from({ length: nv }, () => 0.65 + Math.random() * 0.70),
      rot:    Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 0.026,
    };
  }

  _spawnWave() {
    this.wave++;
    const count = Math.min(3 + this.wave, 9);
    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x, y;
      if      (edge === 0) { x = Math.random() * this.W; y = 0; }
      else if (edge === 1) { x = this.W; y = Math.random() * this.H; }
      else if (edge === 2) { x = Math.random() * this.W; y = this.H; }
      else                  { x = 0;     y = Math.random() * this.H; }
      this.asteroids.push(this._makeAsteroid(x, y, 'large'));
    }
  }

  // ── GAME FLOW ─────────────────────────────────────────────────────────────────
  start() {
    clearTimeout(this._deathTimer);
    cancelAnimationFrame(this.animId);

    this.score      = 0;
    this.lives      = 3;
    this.wave       = 0;
    this.invincible = 0;
    this.fireCooldown = 0;
    this.bullets    = [];
    this.asteroids  = [];
    this.particles  = [];
    this.popups     = [];
    this.ship       = this._makeShip();

    this._updateScore();
    this._updateLives();
    this._spawnWave();

    if (this.overlayEl) this.overlayEl.hidden = true;
    this.isRunning = true;
    this.lastTime  = performance.now();
    this.animId    = requestAnimationFrame((t) => this._loop(t));
  }

  _loop(ts) {
    if (!this.isRunning) return;
    const dt = Math.min((ts - this.lastTime) / 16.667, 3);
    this.lastTime = ts;
    this._update(dt);
    this._draw();
    this.animId = requestAnimationFrame((t) => this._loop(t));
  }

  _gameOver() {
    this.isRunning = false;
    cancelAnimationFrame(this.animId);
    const isNewHigh = MiniJogos.saveHighScore('asteroids', this.score);
    if (this.highScoreEl) {
      this.highScoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('asteroids'));
    }
    if (this.overlayEl) {
      this.overlayEl.hidden = false;
      if (this.overlayTitleEl) {
        this.overlayTitleEl.textContent = isNewHigh ? '&#11088; Novo Recorde!' : 'Game Over';
        this.overlayTitleEl.innerHTML   = isNewHigh ? '&#11088; Novo Recorde!' : 'Game Over';
      }
      if (this.finalScoreEl) {
        this.finalScoreEl.textContent = MiniJogos.formatScore(this.score);
      }
    }
  }

  restart() {
    clearTimeout(this._deathTimer);
    cancelAnimationFrame(this.animId);
    this.isRunning = false;
    if (this.overlayEl) this.overlayEl.hidden = true;
    this.start();
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────
  _update(dt) {
    const { W, H, keys, touch } = this;

    // ---- Ship movement ----
    if (this.ship) {
      const ship = this.ship;
      const ROT      = 0.055 * dt;
      const THRUST   = 0.13  * dt;
      const MAX_SPD  = Math.min(W, H) * 0.0075;
      const FRICTION = 0.992;

      if (keys['ArrowLeft']  || keys['KeyA'] || touch.left)  ship.angle -= ROT;
      if (keys['ArrowRight'] || keys['KeyD'] || touch.right) ship.angle += ROT;

      ship.thrusting = !!(keys['ArrowUp'] || keys['KeyW'] || touch.thrust);
      if (ship.thrusting) {
        ship.vx += Math.cos(ship.angle) * THRUST;
        ship.vy += Math.sin(ship.angle) * THRUST;
        const spd = Math.hypot(ship.vx, ship.vy);
        if (spd > MAX_SPD) {
          ship.vx = ship.vx / spd * MAX_SPD;
          ship.vy = ship.vy / spd * MAX_SPD;
        }
      }
      ship.vx *= FRICTION;
      ship.vy *= FRICTION;
      ship.x = (ship.x + ship.vx * dt + W) % W;
      ship.y = (ship.y + ship.vy * dt + H) % H;
    }

    // ---- Timers ----
    if (this.invincible  > 0) this.invincible  -= dt;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // ---- Fire (keyboard Space or touch hold) ----
    if (this.ship && this.fireCooldown <= 0 && (keys['Space'] || touch.fire)) {
      this._fireBullet();
      this.fireCooldown = 11;
    }

    // ---- Bullets ----
    for (const b of this.bullets) {
      b.x = (b.x + b.vx * dt + W) % W;
      b.y = (b.y + b.vy * dt + H) % H;
      b.life -= dt;
    }
    this.bullets = this.bullets.filter(b => b.life > 0);

    // ---- Asteroids ----
    for (const a of this.asteroids) {
      a.x = (a.x + a.vx * dt + W) % W;
      a.y = (a.y + a.vy * dt + H) % H;
      a.rot += a.rotSpd * dt;
    }

    // ---- Particles ----
    for (const p of this.particles) {
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vx *= 0.978;
      p.vy *= 0.978;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    // ---- Score popups ----
    for (const sp of this.popups) {
      sp.y    -= 0.45 * dt;
      sp.life -= dt;
    }
    this.popups = this.popups.filter(sp => sp.life > 0);

    // ---- Bullet–asteroid collisions ----
    this._checkBulletAsteroid();

    // ---- Next wave ----
    if (this.asteroids.length === 0) this._spawnWave();

    // ---- Ship–asteroid collision ----
    if (this.ship && this.invincible <= 0) {
      const shipR = Math.min(W, H) * 0.022;
      for (const a of this.asteroids) {
        if (Math.hypot(this.ship.x - a.x, this.ship.y - a.y) < a.radius * 0.80 + shipR) {
          this._loseLife();
          break;
        }
      }
    }
  }

  _checkBulletAsteroid() {
    const destroyed = new Set();
    const born      = [];

    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      for (let i = 0; i < this.asteroids.length; i++) {
        if (destroyed.has(i)) continue;
        const a = this.asteroids[i];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.radius) {
          destroyed.add(i);
          b.life = 0;
          this.score += a.pts;
          this._updateScore();
          const palette = { large: '#ff5757', medium: '#ffb347', small: '#00e5a0' };
          this._explode(a.x, a.y, palette[a.tier], a.tier === 'large' ? 16 : a.tier === 'medium' ? 12 : 8);
          this.popups.push({ x: a.x, y: a.y - a.radius, text: '+' + a.pts, life: 38, maxLife: 38 });
          if (a.tier === 'large') {
            born.push(this._makeAsteroid(a.x, a.y, 'medium'));
            born.push(this._makeAsteroid(a.x, a.y, 'medium'));
          } else if (a.tier === 'medium') {
            born.push(this._makeAsteroid(a.x, a.y, 'small'));
            born.push(this._makeAsteroid(a.x, a.y, 'small'));
          }
        }
      }
    }

    this.asteroids = this.asteroids.filter((_, i) => !destroyed.has(i));
    this.asteroids.push(...born);
    this.bullets   = this.bullets.filter(b => b.life > 0);
  }

  _fireBullet() {
    const { ship, W, H } = this;
    const sz  = Math.min(W, H) * 0.035;
    const spd = Math.min(W, H) * 0.009;
    this.bullets.push({
      x:    ship.x + Math.cos(ship.angle) * sz * 1.8,
      y:    ship.y + Math.sin(ship.angle) * sz * 1.8,
      vx:   Math.cos(ship.angle) * spd + ship.vx * 0.3,
      vy:   Math.sin(ship.angle) * spd + ship.vy * 0.3,
      life: 58,
    });
  }

  _explode(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a   = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color,
        size: 1.2 + Math.random() * 2.5,
        life:    28 + Math.random() * 32,
        maxLife: 60,
      });
    }
  }

  _loseLife() {
    this.lives--;
    this._updateLives();
    this._explode(this.ship.x, this.ship.y, '#8B5CF6', 24);

    if (this.lives <= 0) {
      this.ship = null;
      this._deathTimer = setTimeout(() => this._gameOver(), 1100);
    } else {
      this.ship       = this._makeShip();
      this.invincible = 180;
    }
  }

  _updateScore() {
    if (this.scoreEl) this.scoreEl.textContent = MiniJogos.formatScore(this.score);
  }

  _updateLives() {
    if (this.livesEl) {
      const n = Math.max(0, this.lives);
      this.livesEl.textContent = '\u2665'.repeat(n) || '\u2205';
    }
  }

  // ── DRAW ──────────────────────────────────────────────────────────────────────
  _draw() {
    const { ctx, W, H } = this;

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, W, H);

    this._drawStars();

    // Wave label
    ctx.fillStyle    = 'rgba(153,153,187,0.55)';
    ctx.font         = `${Math.round(H * 0.026)}px 'IBM Plex Mono', monospace`;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`ONDA ${this.wave}`, W - 10, 8);

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Asteroids
    for (const a of this.asteroids) this._drawAsteroid(a);

    // Bullets (with glow)
    ctx.fillStyle  = '#00e5a0';
    ctx.shadowColor = '#00e5a0';
    ctx.shadowBlur  = 7;
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Ship (blinks during invincibility)
    if (this.ship) {
      const blink = this.invincible > 0 && Math.floor(this.invincible / 5) % 2 === 0;
      if (!blink) this._drawShip(this.ship);
    }

    // Score popups
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(H * 0.032)}px 'IBM Plex Mono', monospace`;
    for (const sp of this.popups) {
      ctx.globalAlpha = sp.life / sp.maxLife;
      ctx.fillStyle   = '#ffb347';
      ctx.fillText(sp.text, sp.x, sp.y);
    }
    ctx.globalAlpha = 1;
  }

  _drawStars() {
    const { ctx, W, H } = this;
    if (!this._stars) {
      this._stars = Array.from({ length: 75 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.1 + 0.3,
        a: 0.25 + Math.random() * 0.55,
      }));
    }
    for (const s of this._stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle   = '#e8e8f0';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawShip(ship) {
    const { ctx, W, H } = this;
    const sz = Math.min(W, H) * 0.035;

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    ctx.shadowColor = '#8B5CF6';
    ctx.shadowBlur  = 12;

    // Hull
    ctx.fillStyle   = 'rgba(139,92,246,0.18)';
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo( sz * 1.6,  0);
    ctx.lineTo(-sz * 0.9,  sz * 0.85);
    ctx.lineTo(-sz * 0.5,  0);
    ctx.lineTo(-sz * 0.9, -sz * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Engine flame
    if (ship.thrusting) {
      const flicker = 0.9 + Math.random() * 0.5;
      ctx.fillStyle   = 'rgba(255,179,71,0.5)';
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(-sz * 0.5,  sz * 0.38);
      ctx.lineTo(-sz * 1.5 * flicker - sz * 0.2, 0);
      ctx.lineTo(-sz * 0.5, -sz * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawAsteroid(a) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);

    const stroke = { large: '#ff5757', medium: '#ff7a7a', small: '#ffb347' }[a.tier];
    const fill   = { large: 'rgba(255,87,87,0.08)', medium: 'rgba(255,122,122,0.10)', small: 'rgba(255,179,71,0.10)' }[a.tier];

    ctx.strokeStyle = stroke;
    ctx.fillStyle   = fill;
    ctx.lineWidth   = a.tier === 'small' ? 1.5 : 2;

    ctx.beginPath();
    for (let i = 0; i < a.verts.length; i++) {
      const ang = (i / a.verts.length) * Math.PI * 2;
      const r   = a.radius * a.verts[i];
      const px  = Math.cos(ang) * r;
      const py  = Math.sin(ang) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  _drawIdle() {
    const { ctx, W, H } = this;
    if (!W || !H) return;

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, W, H);
    this._drawStars();

    // Decorative asteroids
    const decorative = [
      { x: W * 0.14, y: H * 0.22, radius: Math.min(W,H) * 0.065, verts: [0.9,0.75,1.1,0.8,1.0,0.7,0.9,1.1,0.85], rot: 0.3,  tier: 'large'  },
      { x: W * 0.84, y: H * 0.30, radius: Math.min(W,H) * 0.038, verts: [0.8,1.1,0.7,0.9,1.0,0.85,0.75,1.0],       rot: 1.2,  tier: 'medium' },
      { x: W * 0.76, y: H * 0.74, radius: Math.min(W,H) * 0.065, verts: [1.0,0.8,1.1,0.7,0.9,1.05,0.8,0.95,1.1],   rot: 0.8,  tier: 'large'  },
      { x: W * 0.22, y: H * 0.76, radius: Math.min(W,H) * 0.020, verts: [0.9,1.0,0.8,1.1,0.7,0.9,1.0,0.85],        rot: 0.5,  tier: 'small'  },
    ];
    for (const a of decorative) this._drawAsteroid(a);

    ctx.fillStyle    = '#9999bb';
    ctx.font         = `${Math.round(Math.min(W, H) * 0.038)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Clique em "Iniciar" para jogar', W / 2, H / 2);
  }
}

// ── INIT ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const game = new AsteroidsGame();

  document.getElementById('startBtn')?.addEventListener('click',    () => game.start());
  document.getElementById('restartBtn')?.addEventListener('click',  () => game.restart());
  document.getElementById('playAgainBtn')?.addEventListener('click', () => game.restart());
});
