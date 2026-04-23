/* ============================================
   ASTEROIDS — game.js
   ============================================ */

const GAME_ID = 'asteroids';

const C = {
  BG:        '#0f0f23',
  SHIP:      '#7c5cff',
  ASTEROID:  '#ff5757',
  BULLET:    '#00e5a0',
  THRUST:    '#ffb347',
  TEXT:      '#e8e8f0',
  TEXT_SUB:  '#9999bb',
};

/* Points awarded per asteroid size (3=large, 2=medium, 1=small) */
const PTS = { 3: 20, 2: 50, 1: 100 };

class AsteroidsGame {
  constructor() {
    this.canvas     = document.getElementById('gameCanvas');
    this.ctx        = this.canvas.getContext('2d');
    this.overlay    = document.getElementById('gameOverlay');
    this.scoreEl    = document.getElementById('score');
    this.highscoreEl = document.getElementById('highscore');

    this.state   = 'idle';
    this.score   = 0;
    this.lives   = 3;
    this.level   = 1;
    this.hi      = MiniJogos.getHighScore(GAME_ID);

    this.ship        = null;
    this.bullets     = [];
    this.asteroids   = [];
    this.particles   = [];
    this.floatScores = [];

    this.keys        = {};
    this.touch       = { left: false, right: false, thrust: false, fire: false };
    this.animId      = null;
    this.lastTime    = 0;
    this.invincible  = 0;
    this.shootCD     = 0;
    this.deathTimer  = 0;
    this._stars      = null;

    this.resize();
    this.bindEvents();
    this.showOverlay('Asteroids', 'Destrua os asteroides sem ser atingido!', 'Iniciar');
    this.drawFrame();
  }

  /* ── Resize ─────────────────────────────── */

  resize() {
    const { width, height } = MiniJogos.resizeCanvas(this.canvas, 760, 4 / 3);
    this.W = width;
    this.H = height;
    this._stars = null;
    if (this.state !== 'playing' && this.state !== 'dead') this.drawFrame();
  }

  /* ── Event wiring ────────────────────────── */

  bindEvents() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('resize', () => this.resize());

    document.getElementById('startBtn').addEventListener('click', () => this.start());
    document.getElementById('restartBtn').addEventListener('click', () => this.start());
    document.getElementById('overlayBtn').addEventListener('click', () => this.start());

    const addTouch = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on  = e => { e.preventDefault(); this.touch[key] = true;  el.classList.add('pressed');    };
      const off = e => { e.preventDefault(); this.touch[key] = false; el.classList.remove('pressed'); };
      el.addEventListener('touchstart', on,  { passive: false });
      el.addEventListener('touchend',   off, { passive: false });
      el.addEventListener('mousedown',  on);
      el.addEventListener('mouseup',    off);
      el.addEventListener('mouseleave', off);
    };
    addTouch('touchLeft',   'left');
    addTouch('touchRight',  'right');
    addTouch('touchThrust', 'thrust');
    addTouch('touchFire',   'fire');
  }

  /* ── Overlay helpers ─────────────────────── */

  showOverlay(title, msg, btnLabel) {
    document.getElementById('overlayTitle').textContent = title;
    document.getElementById('overlayMsg').textContent   = msg;
    document.getElementById('overlayBtn').textContent   = btnLabel || 'Jogar de Novo';
    this.overlay.classList.add('visible');
  }

  hideOverlay() {
    this.overlay.classList.remove('visible');
  }

  /* ── Game lifecycle ──────────────────────── */

  start() {
    cancelAnimationFrame(this.animId);
    this.hideOverlay();

    this.state       = 'playing';
    this.score       = 0;
    this.lives       = 3;
    this.level       = 1;
    this.ship        = this.makeShip();
    this.bullets     = [];
    this.asteroids   = [];
    this.particles   = [];
    this.floatScores = [];
    this.invincible  = 180;
    this.shootCD     = 0;
    this.deathTimer  = 0;
    this.keys        = {};

    this.spawnRocks(4);
    this.updateUI();
    this.lastTime = performance.now();
    this.animId = requestAnimationFrame(t => this.loop(t));
  }

  updateUI() {
    this.scoreEl.textContent    = MiniJogos.formatScore(this.score);
    this.highscoreEl.textContent = MiniJogos.formatScore(this.hi);
  }

  loop(t) {
    const dt = Math.min(t - this.lastTime, 50);
    this.lastTime = t;
    this.update(dt);
    this.drawFrame();
    if (this.state === 'playing' || this.state === 'dead') {
      this.animId = requestAnimationFrame(ts => this.loop(ts));
    }
  }

  /* ── Entity factories ────────────────────── */

  makeShip() {
    return {
      x: this.W / 2, y: this.H / 2,
      angle: -Math.PI / 2,
      vx: 0, vy: 0,
      r: 14,
      flame: 0,
    };
  }

  makeRock(x, y, size) {
    const radii  = [0, 14, 28, 46];
    const speed  = (0.35 + Math.random() * 0.65) * (4 - size) * 0.45;
    const dir    = Math.random() * Math.PI * 2;
    const n      = 7 + Math.floor(Math.random() * 5);
    const verts  = Array.from({ length: n }, (_, i) => {
      const a  = (i / n) * Math.PI * 2;
      const rr = 0.65 + Math.random() * 0.35;
      return { x: Math.cos(a) * rr, y: Math.sin(a) * rr };
    });
    return {
      x, y,
      vx: Math.cos(dir) * speed,
      vy: Math.sin(dir) * speed,
      r:     radii[size],
      size,
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - 0.5) * 0.024,
      verts,
    };
  }

  spawnRocks(n) {
    for (let i = 0; i < n; i++) {
      let x, y;
      do {
        x = Math.random() * this.W;
        y = Math.random() * this.H;
      } while (Math.hypot(x - this.W / 2, y - this.H / 2) < 130);
      this.asteroids.push(this.makeRock(x, y, 3));
    }
  }

  /* ── Update ──────────────────────────────── */

  update(dt) {
    if (this.state !== 'playing' && this.state !== 'dead') return;
    const f = dt / 16.667;

    if (this.shootCD  > 0) this.shootCD  -= f;
    if (this.invincible > 0) this.invincible -= f;

    if (this.state === 'dead') {
      this.deathTimer -= f;
      if (this.deathTimer <= 0) {
        if (this.lives <= 0) this.endGame();
        else this.respawn();
      }
    } else {
      this.updateShip(f);
      this.checkHits();
      if (this.asteroids.length === 0) this.nextLevel();
    }

    this.tickBullets(f);
    this.tickRocks(f);
    this.tickParticles(f);
    this.tickFloatScores(f);
    this.updateUI();
  }

  updateShip(f) {
    const s     = this.ship;
    const TURN  = 0.062;
    const THRUST = 0.16;
    const DRAG  = 0.989;
    const MAX_V = 8;

    const left  = this.keys['ArrowLeft']  || this.keys['KeyA'] || this.touch.left;
    const right = this.keys['ArrowRight'] || this.keys['KeyD'] || this.touch.right;
    const fwd   = this.keys['ArrowUp']    || this.keys['KeyW'] || this.touch.thrust;
    const fire  = this.keys['Space'] || this.touch.fire;

    if (left)  s.angle -= TURN * f;
    if (right) s.angle += TURN * f;

    s.flame = 0;
    if (fwd) {
      s.vx   += Math.cos(s.angle) * THRUST * f;
      s.vy   += Math.sin(s.angle) * THRUST * f;
      s.flame = 1;
      if (Math.random() < 0.45) this.thrustParticle(s);
    }

    const spd = Math.hypot(s.vx, s.vy);
    if (spd > MAX_V) { s.vx = s.vx / spd * MAX_V; s.vy = s.vy / spd * MAX_V; }

    s.vx *= Math.pow(DRAG, f);
    s.vy *= Math.pow(DRAG, f);
    s.x   = this.wrap(s.x + s.vx * f, this.W);
    s.y   = this.wrap(s.y + s.vy * f, this.H);

    if (fire && this.shootCD <= 0) {
      this.shoot(s);
      this.shootCD = 12;
    }
  }

  tickBullets(f) {
    this.bullets = this.bullets.filter(b => {
      b.x = this.wrap(b.x + b.vx * f, this.W);
      b.y = this.wrap(b.y + b.vy * f, this.H);
      return (b.life -= f) > 0;
    });
  }

  tickRocks(f) {
    for (const a of this.asteroids) {
      a.x     = this.wrap(a.x + a.vx * f, this.W);
      a.y     = this.wrap(a.y + a.vy * f, this.H);
      a.angle += a.spin * f;
    }
  }

  tickParticles(f) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * f;
      p.y += p.vy * f;
      return (p.life -= f) > 0;
    });
  }

  tickFloatScores(f) {
    this.floatScores = this.floatScores.filter(fs => {
      fs.y  -= 0.6 * f;
      return (fs.life -= f) > 0;
    });
  }

  checkHits() {
    /* bullets vs asteroids */
    outer: for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const a = this.asteroids[ai];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r + 3) {
          this.bullets.splice(bi, 1);
          this.hitRock(ai);
          continue outer;
        }
      }
    }

    /* ship vs asteroids */
    if (this.invincible > 0) return;
    for (const a of this.asteroids) {
      if (Math.hypot(this.ship.x - a.x, this.ship.y - a.y) < a.r + this.ship.r * 0.75) {
        this.killShip();
        return;
      }
    }
  }

  hitRock(idx) {
    const a   = this.asteroids.splice(idx, 1)[0];
    const pts = PTS[a.size] || 0;
    this.score += pts;
    if (MiniJogos.saveHighScore(GAME_ID, this.score)) this.hi = this.score;

    this.floatScores.push({ x: a.x, y: a.y, text: `+${pts}`, life: 42, maxLife: 42 });
    this.burst(a.x, a.y, C.ASTEROID, 8 + a.size * 4, 1 + a.size * 0.5);

    if (a.size > 1) {
      for (let i = 0; i < 2; i++) {
        const c = this.makeRock(a.x, a.y, a.size - 1);
        c.vx += a.vx * 0.4;
        c.vy += a.vy * 0.4;
        this.asteroids.push(c);
      }
    }
  }

  killShip() {
    this.burst(this.ship.x, this.ship.y, C.SHIP,   24, 4.5);
    this.burst(this.ship.x, this.ship.y, C.THRUST, 12, 3);
    this.ship  = null;
    this.lives -= 1;
    this.state  = 'dead';
    this.deathTimer = 100;
  }

  respawn() {
    this.ship       = this.makeShip();
    this.invincible = 180;
    this.state      = 'playing';
  }

  nextLevel() {
    this.level++;
    this.spawnRocks(3 + Math.min(this.level, 9));
  }

  endGame() {
    this.state = 'gameover';
    cancelAnimationFrame(this.animId);
    const msg = `Pontos: ${this.score}  •  Recorde: ${this.hi}`;
    this.showOverlay('Game Over', msg, 'Jogar de Novo');
  }

  /* ── Helpers ─────────────────────────────── */

  wrap(v, max) { return ((v % max) + max) % max; }

  shoot(s) {
    const SPD = 10;
    this.bullets.push({
      x:    s.x + Math.cos(s.angle) * s.r,
      y:    s.y + Math.sin(s.angle) * s.r,
      vx:   Math.cos(s.angle) * SPD + s.vx * 0.3,
      vy:   Math.sin(s.angle) * SPD + s.vy * 0.3,
      life: 65,
    });
  }

  burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a   = Math.random() * Math.PI * 2;
      const spd = (0.8 + Math.random() * 2.2) * speed;
      const life = 28 + Math.random() * 38;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life, maxLife: life,
        color, r: 1.5 + Math.random() * 2.5,
      });
    }
  }

  thrustParticle(s) {
    const a    = s.angle + Math.PI + (Math.random() - 0.5) * 0.55;
    const spd  = 1.8 + Math.random() * 2.5;
    const life = 10 + Math.random() * 8;
    this.particles.push({
      x:  s.x - Math.cos(s.angle) * s.r * 0.65,
      y:  s.y - Math.sin(s.angle) * s.r * 0.65,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life, maxLife: life,
      color: C.THRUST, r: 1.8,
    });
  }

  /* ── Stars (stable pseudo-random) ───────── */

  buildStars() {
    const n    = Math.floor(this.W * this.H / 2600) + 45;
    let   seed = 31;
    const rng  = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
    this._stars = Array.from({ length: n }, () => ({
      x: rng() * this.W,
      y: rng() * this.H,
      r: rng() * 1.2 + 0.25,
      a: rng() * 0.45 + 0.08,
    }));
  }

  /* ── Draw ────────────────────────────────── */

  drawFrame() {
    const { ctx, W, H } = this;

    ctx.fillStyle = C.BG;
    ctx.fillRect(0, 0, W, H);

    this.drawStars();
    this.drawParticles();
    this.drawRocks();
    this.drawBullets();
    if (this.ship) this.drawShip();
    this.drawFloatScores();
    this.drawHUD();

    if (this.state === 'dead') {
      const sz = Math.round(W * 0.048);
      ctx.fillStyle  = C.THRUST;
      ctx.font       = `bold ${sz}px monospace`;
      ctx.textAlign  = 'center';
      ctx.fillText('NAVE DESTRUÍDA!', W / 2, H / 2 - sz * 0.1);
      if (this.lives > 0) {
        ctx.fillStyle = C.TEXT_SUB;
        ctx.font      = `${Math.round(sz * 0.62)}px monospace`;
        const plural  = this.lives === 1 ? 'vida restante' : 'vidas restantes';
        ctx.fillText(`${this.lives} ${plural}`, W / 2, H / 2 + sz * 0.9);
      }
      ctx.textAlign = 'left';
    }
  }

  drawStars() {
    if (!this._stars) this.buildStars();
    const ctx = this.ctx;
    for (const s of this._stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawRocks() {
    const ctx = this.ctx;
    for (const a of this.asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.beginPath();
      for (let i = 0; i < a.verts.length; i++) {
        const v = a.verts[i];
        if (i === 0) ctx.moveTo(v.x * a.r, v.y * a.r);
        else         ctx.lineTo(v.x * a.r, v.y * a.r);
      }
      ctx.closePath();
      ctx.fillStyle   = 'rgba(255,87,87,0.07)';
      ctx.fill();
      ctx.strokeStyle = C.ASTEROID;
      ctx.lineWidth   = 1.5;
      ctx.shadowBlur  = 5;
      ctx.shadowColor = C.ASTEROID;
      ctx.stroke();
      ctx.shadowBlur  = 0;
      ctx.restore();
    }
  }

  drawBullets() {
    const ctx = this.ctx;
    ctx.fillStyle   = C.BULLET;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = C.BULLET;
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  drawShip() {
    const s   = this.ship;
    const ctx = this.ctx;

    /* blink while invincible */
    if (this.invincible > 0 && Math.floor(this.invincible / 7) % 2 === 0) return;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);

    /* thrust flame */
    if (s.flame) {
      const flare = 0.85 + Math.random() * 0.4;
      ctx.globalAlpha = 0.65 + Math.random() * 0.3;
      ctx.fillStyle   = C.THRUST;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = C.THRUST;
      ctx.beginPath();
      ctx.moveTo(-s.r * 0.36, -s.r * 0.38);
      ctx.lineTo(-s.r * flare, 0);
      ctx.lineTo(-s.r * 0.36,  s.r * 0.38);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
    }

    /* hull */
    ctx.strokeStyle = C.SHIP;
    ctx.fillStyle   = 'rgba(124,92,255,0.14)';
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 14;
    ctx.shadowColor = C.SHIP;
    ctx.beginPath();
    ctx.moveTo( s.r,        0);
    ctx.lineTo(-s.r * 0.64, -s.r * 0.60);
    ctx.lineTo(-s.r * 0.36,  0);
    ctx.lineTo(-s.r * 0.64,  s.r * 0.60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawFloatScores() {
    const ctx = this.ctx;
    const fsz = Math.round(this.W * 0.026);
    ctx.font      = `bold ${fsz}px monospace`;
    ctx.textAlign = 'center';
    for (const fs of this.floatScores) {
      ctx.globalAlpha = fs.life / fs.maxLife;
      ctx.fillStyle   = C.BULLET;
      ctx.fillText(fs.text, fs.x, fs.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign   = 'left';
  }

  drawHUD() {
    const ctx = this.ctx;
    const sz  = Math.round(this.W * 0.030);

    /* life icons (mini ships) */
    for (let i = 0; i < this.lives; i++) {
      ctx.save();
      ctx.translate(14 + i * (sz * 1.75 + 3), 14);
      ctx.strokeStyle = C.SHIP;
      ctx.lineWidth   = 1.5;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = C.SHIP;
      ctx.beginPath();
      ctx.moveTo( sz,        0);
      ctx.lineTo(-sz * 0.64, -sz * 0.58);
      ctx.lineTo(-sz * 0.36,  0);
      ctx.lineTo(-sz * 0.64,  sz * 0.58);
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    /* level label */
    ctx.fillStyle = C.TEXT_SUB;
    ctx.font      = `${Math.round(this.W * 0.026)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`Nível ${this.level}`, this.W - 10, this.H - 10);
    ctx.textAlign = 'left';
  }
}

/* ── Bootstrap ───────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  new AsteroidsGame();
});
