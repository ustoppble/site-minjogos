(function () {
  'use strict';

  // --- DOM ---
  const canvas      = document.getElementById('gameCanvas');
  const ctx         = canvas.getContext('2d');
  const scoreEl     = document.getElementById('score');
  const livesEl     = document.getElementById('lives');
  const highscoreEl = document.getElementById('highscore');
  const startBtn    = document.getElementById('startBtn');
  const restartBtn  = document.getElementById('restartBtn');
  const overlayEl   = document.getElementById('gameOverlay');
  const oTitle      = document.getElementById('overlayTitle');
  const oMsg        = document.getElementById('overlayMsg');
  const oBtn        = document.getElementById('overlayBtn');

  // --- Colors (design system palette) ---
  const C = {
    bg:           '#0f0f23',
    ship:         '#7c5cff',
    shipGlow:     'rgba(124,92,255,0.18)',
    thrust:       '#ffb347',
    thrustCore:   '#ff5757',
    bullet:       '#00e5a0',
    bulletGlow:   'rgba(0,229,160,0.22)',
    asteroid:     '#9999bb',
    asteroidFill: 'rgba(153,153,187,0.07)',
    danger:       '#ff5757',
    warning:      '#ffb347',
    text:         '#e8e8f0',
    muted:        '#9999bb',
  };

  // --- Logical canvas size ---
  const LW = 600, LH = 450;

  // --- Physics constants ---
  const TURN_SPD   = Math.PI * 1.8;  // rad/s
  const THRUST_F   = 200;            // px/s²
  const MAX_SPD    = 270;            // px/s
  const FRICTION   = 0.989;
  const SHIP_R     = 14;
  const INVINCIBLE = 3.0;            // s
  const BLINK_HZ   = 8;
  const SHOOT_CD   = 0.22;           // s between shots
  const BULLET_SPD = 430;
  const BULLET_TTL = 1.3;            // s

  // --- Asteroid constants ---
  const A_RADII  = { large: 40, medium: 20, small: 10 };
  const A_POINTS = { large: 20, medium: 50, small: 100 };
  const A_BASE   = 48;               // base speed
  const A_BONUS  = 14;               // extra speed per level
  const A_START  = 4;                // initial asteroid count

  // --- Game state ---
  let state = 'idle';
  let score = 0, lives = 3, level = 1;
  let ship = null, bullets = [], asteroids = [], particles = [];
  let shootCd = 0, raf = null, lastTs = 0;

  // --- Input ---
  const keys = {};
  let tLeft = false, tRight = false, tThrust = false, tFire = false;

  // --- Static starfield ---
  const STARS = Array.from({ length: 110 }, () => ({
    x: Math.random() * LW,
    y: Math.random() * LH,
    r: Math.random() * 1.4 + 0.3,
    a: Math.random() * 0.65 + 0.2,
  }));

  // --- Canvas sizing ---
  function resizeCanvas() {
    const w = Math.min(canvas.parentElement.clientWidth, LW);
    canvas.width  = LW;
    canvas.height = LH;
    canvas.style.width  = w + 'px';
    canvas.style.height = (w * LH / LW) + 'px';
  }

  // --- Screen wrap ---
  function wx(v) {
    if (v < -50)       return v + LW + 100;
    if (v > LW + 50)   return v - LW - 100;
    return v;
  }
  function wy(v) {
    if (v < -50)       return v + LH + 100;
    if (v > LH + 50)   return v - LH - 100;
    return v;
  }

  // --- Safe spawn positions (away from center) ---
  function safeX() {
    return Math.random() < 0.5
      ? Math.random() * LW * 0.2
      : LW * 0.8 + Math.random() * LW * 0.2;
  }
  function safeY() {
    return Math.random() < 0.5
      ? Math.random() * LH * 0.2
      : LH * 0.8 + Math.random() * LH * 0.2;
  }

  // --- Entity factories ---
  function mkShip() {
    return {
      x: LW / 2, y: LH / 2,
      vx: 0, vy: 0,
      angle: -Math.PI / 2,
      invincible: INVINCIBLE,
      thrusting: false,
    };
  }

  function mkAsteroid(x, y, size, vx, vy) {
    const r = A_RADII[size];
    const n = 8 + Math.floor(Math.random() * 5);
    const verts = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const d = r * (0.62 + Math.random() * 0.72);
      return { x: Math.cos(a) * d, y: Math.sin(a) * d };
    });
    const spd  = A_BASE + Math.random() * A_BONUS * level;
    const ang  = Math.random() * Math.PI * 2;
    return {
      x:       x   ?? safeX(),
      y:       y   ?? safeY(),
      vx:      vx  ?? Math.cos(ang) * spd,
      vy:      vy  ?? Math.sin(ang) * spd,
      rot:     0,
      rotSpd:  (Math.random() - 0.5) * 1.8,
      size,
      verts,
    };
  }

  function mkBullet() {
    return {
      x:    ship.x + Math.cos(ship.angle) * SHIP_R * 1.5,
      y:    ship.y + Math.sin(ship.angle) * SHIP_R * 1.5,
      vx:   Math.cos(ship.angle) * BULLET_SPD + ship.vx * 0.3,
      vy:   Math.sin(ship.angle) * BULLET_SPD + ship.vy * 0.3,
      life: BULLET_TTL,
    };
  }

  // --- Particles ---
  const PART_COLS = [C.danger, C.warning, '#e8e8f0', C.muted];

  function explode(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a    = Math.random() * Math.PI * 2;
      const sp   = 30 + Math.random() * 160;
      const life = 0.35 + Math.random() * 0.75;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life, maxLife: life,
        color: PART_COLS[Math.floor(Math.random() * PART_COLS.length)],
        size: 1.5 + Math.random() * 2.5,
      });
    }
  }

  // --- Asteroid splitting ---
  function splitAsteroid(a) {
    const frags = [];
    const nextSize = a.size === 'large' ? 'medium' : 'small';
    if (a.size !== 'small') {
      for (let k = 0; k < 2; k++) {
        const ang = Math.random() * Math.PI * 2;
        const sp  = Math.hypot(a.vx, a.vy) * 1.45 + 30;
        frags.push(mkAsteroid(a.x, a.y, nextSize, Math.cos(ang) * sp, Math.sin(ang) * sp));
      }
    }
    return frags;
  }

  // --- Collision detection ---
  function collide() {
    const deadBullets   = new Set();
    const deadAsteroids = new Set();
    const newFrags      = [];

    for (let bi = 0; bi < bullets.length; bi++) {
      if (deadBullets.has(bi)) continue;
      const b = bullets[bi];
      for (let ai = 0; ai < asteroids.length; ai++) {
        if (deadAsteroids.has(ai)) continue;
        const a = asteroids[ai];
        if (Math.hypot(b.x - a.x, b.y - a.y) < A_RADII[a.size] + 3) {
          deadBullets.add(bi);
          deadAsteroids.add(ai);
          score += A_POINTS[a.size];
          scoreEl.textContent = MiniJogos.formatScore(score);
          explode(a.x, a.y, a.size === 'large' ? 12 : a.size === 'medium' ? 8 : 5);
          newFrags.push(...splitAsteroid(a));
          break;
        }
      }
    }

    bullets   = bullets.filter((_, i) => !deadBullets.has(i));
    asteroids = asteroids.filter((_, i) => !deadAsteroids.has(i));
    asteroids.push(...newFrags);

    // Ship vs asteroids
    if (!ship || ship.invincible > 0) return;
    for (const a of asteroids) {
      if (Math.hypot(ship.x - a.x, ship.y - a.y) < A_RADII[a.size] + SHIP_R * 0.78) {
        killShip();
        return;
      }
    }
  }

  // --- Ship death ---
  function killShip() {
    explode(ship.x, ship.y, 22);
    lives--;
    livesEl.textContent = Math.max(0, lives);
    ship = null;
    if (lives <= 0) {
      state = 'ending';
      setTimeout(endGame, 1200);
    } else {
      setTimeout(function () {
        if (state === 'playing') ship = mkShip();
      }, 800);
    }
  }

  // --- Level transition ---
  function nextLevel() {
    level++;
    if (ship) ship.invincible = INVINCIBLE * 0.6;
    const n = A_START + level - 1;
    for (let i = 0; i < n; i++) {
      asteroids.push(mkAsteroid(null, null, 'large'));
    }
  }

  // --- Update ---
  function update(dt) {
    shootCd -= dt;

    if (ship) {
      const left   = keys['ArrowLeft']  || keys['a'] || tLeft;
      const right  = keys['ArrowRight'] || keys['d'] || tRight;
      const thrust = keys['ArrowUp']    || keys['w'] || tThrust;
      const fire   = keys[' '] || tFire;

      if (left)  ship.angle -= TURN_SPD * dt;
      if (right) ship.angle += TURN_SPD * dt;
      ship.thrusting = thrust;

      if (thrust) {
        ship.vx += Math.cos(ship.angle) * THRUST_F * dt;
        ship.vy += Math.sin(ship.angle) * THRUST_F * dt;
        const sp = Math.hypot(ship.vx, ship.vy);
        if (sp > MAX_SPD) {
          ship.vx = (ship.vx / sp) * MAX_SPD;
          ship.vy = (ship.vy / sp) * MAX_SPD;
        }
      }

      const fr = Math.pow(FRICTION, dt * 60);
      ship.vx *= fr;
      ship.vy *= fr;
      ship.x = wx(ship.x + ship.vx * dt);
      ship.y = wy(ship.y + ship.vy * dt);
      if (ship.invincible > 0) ship.invincible -= dt;

      if (fire && shootCd <= 0) {
        bullets.push(mkBullet());
        shootCd = SHOOT_CD;
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x = wx(b.x + b.vx * dt);
      b.y = wy(b.y + b.vy * dt);
      b.life -= dt;
      if (b.life <= 0) bullets.splice(i, 1);
    }

    asteroids.forEach(function (a) {
      a.x   = wx(a.x + a.vx * dt);
      a.y   = wy(a.y + a.vy * dt);
      a.rot += a.rotSpd * dt;
    });

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x    += p.vx * dt;
      p.y    += p.vy * dt;
      p.vx   *= 0.97;
      p.vy   *= 0.97;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    collide();

    if (asteroids.length === 0 && state === 'playing') nextLevel();
  }

  // --- Draw ---
  function draw() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, LW, LH);

    // Stars
    STARS.forEach(function (s) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(232,232,240,' + s.a + ')';
      ctx.fill();
    });

    // Particles
    particles.forEach(function (p) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.3 + alpha * 0.7), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Asteroids
    asteroids.forEach(function (a) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.beginPath();
      a.verts.forEach(function (v, i) {
        i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fillStyle = C.asteroidFill;
      ctx.fill();
      ctx.strokeStyle = C.asteroid;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });

    // Bullets
    bullets.forEach(function (b) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = C.bulletGlow;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = C.bullet;
      ctx.fill();
    });

    // Ship
    if (ship) {
      const inv = ship.invincible;
      const visible = inv <= 0 || (Math.floor(inv * BLINK_HZ) % 2 === 0);
      if (visible) {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        if (ship.thrusting) {
          const fl = SHIP_R * (1.3 + Math.random() * 0.5);
          ctx.beginPath();
          ctx.moveTo(-SHIP_R * 0.5, SHIP_R * 0.4);
          ctx.lineTo(-SHIP_R * 0.5 - fl, 0);
          ctx.lineTo(-SHIP_R * 0.5, -SHIP_R * 0.4);
          ctx.strokeStyle  = C.thrust;
          ctx.lineWidth    = 2;
          ctx.lineJoin     = 'round';
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-SHIP_R * 0.5, SHIP_R * 0.22);
          ctx.lineTo(-SHIP_R * 0.5 - fl * 0.55, 0);
          ctx.lineTo(-SHIP_R * 0.5, -SHIP_R * 0.22);
          ctx.strokeStyle = C.thrustCore;
          ctx.lineWidth   = 1.5;
          ctx.stroke();
        }

        // Glow halo
        const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, SHIP_R * 2.5);
        grd.addColorStop(0, C.shipGlow);
        grd.addColorStop(1, 'rgba(124,92,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(0, 0, SHIP_R * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Ship triangle
        ctx.beginPath();
        ctx.moveTo(SHIP_R,        0);
        ctx.lineTo(-SHIP_R * 0.6,  SHIP_R * 0.62);
        ctx.lineTo(-SHIP_R * 0.3,  0);
        ctx.lineTo(-SHIP_R * 0.6, -SHIP_R * 0.62);
        ctx.closePath();
        ctx.strokeStyle = C.ship;
        ctx.lineWidth   = 2;
        ctx.lineJoin    = 'round';
        ctx.stroke();

        ctx.restore();
      }
    }

    // HUD
    ctx.font      = '13px "IBM Plex Mono", monospace';
    ctx.fillStyle = C.muted;
    ctx.textAlign = 'left';
    ctx.fillText('NÍV ' + level, 10, LH - 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.ship;
    ctx.fillText('▲'.repeat(Math.max(0, lives)), LW - 10, LH - 10);
  }

  // --- Game loop ---
  function loop(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    if (state === 'playing' || state === 'ending') update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  // --- Overlay helpers ---
  function showOverlay(title, msg, btnText) {
    oTitle.textContent = title;
    oMsg.textContent   = msg;
    oBtn.textContent   = btnText;
    overlayEl.classList.add('visible');
  }
  function hideOverlay() {
    overlayEl.classList.remove('visible');
  }

  // --- Game lifecycle ---
  function startGame() {
    score = 0; lives = 3; level = 1;
    ship      = mkShip();
    bullets   = [];
    asteroids = [];
    particles = [];
    shootCd   = 0;
    for (let i = 0; i < A_START; i++) {
      asteroids.push(mkAsteroid(null, null, 'large'));
    }
    scoreEl.textContent     = MiniJogos.formatScore(0);
    livesEl.textContent     = lives;
    highscoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('asteroids'));
    hideOverlay();
    state = 'playing';
  }

  function endGame() {
    state = 'gameover';
    MiniJogos.saveHighScore('asteroids', score);
    highscoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('asteroids'));
    showOverlay('Game Over', 'Você fez ' + MiniJogos.formatScore(score) + ' pontos', 'Jogar de Novo');
  }

  // --- Input events ---
  document.addEventListener('keydown', function (e) {
    keys[e.key] = true;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
  });

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  oBtn.addEventListener('click', startGame);

  window.addEventListener('resize', resizeCanvas);

  // --- Touch controls ---
  function bindBtn(id, on, off) {
    const el = document.getElementById(id);
    if (!el) return;
    ['touchstart', 'mousedown'].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.preventDefault(); on(); }, { passive: false });
    });
    ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.preventDefault(); off(); }, { passive: false });
    });
  }

  bindBtn('touchLeft',   function () { tLeft   = true;  }, function () { tLeft   = false; });
  bindBtn('touchRight',  function () { tRight  = true;  }, function () { tRight  = false; });
  bindBtn('touchThrust', function () { tThrust = true;  }, function () { tThrust = false; });
  bindBtn('touchFire',   function () { tFire   = true;  }, function () { tFire   = false; });

  // --- Init ---
  resizeCanvas();
  lastTs = performance.now();
  raf = requestAnimationFrame(loop);
  showOverlay('Asteroids ☄️', 'Destrua os asteroides antes que te destruam!', 'Iniciar');
  scoreEl.textContent     = MiniJogos.formatScore(0);
  livesEl.textContent     = lives;
  highscoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('asteroids'));

})();
