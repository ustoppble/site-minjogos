/* ============================================
   WHACK-A-MOLE — Mini Jogos
   game.js — Logica completa do jogo
   ============================================ */

(function () {
  'use strict';

  const GAME_ID = 'whack-a-mole';
  const COLS = 3;
  const ROWS = 3;
  const GAME_DURATION = 60;
  const GOLD_CHANCE = 0.12;
  const GOLD_POINTS = 50;
  const NORMAL_POINTS = 10;

  // Paleta do design system (canvas nao acessa CSS vars)
  const C = {
    bg:           '#0f0f23',
    holeBg:       '#070712',
    holeRim:      '#252550',
    holeShadow:   'rgba(0,0,0,0.45)',
    moleBody:     '#c4853a',
    moleDark:     '#8a5a22',
    moleGold:     '#f5c842',
    moleGoldDark: '#b8860b',
    moleHit:      '#ff5757',
    moleHitDark:  '#cc2020',
    particle:     '#ffb347',
    particleGold: '#f5c842',
    timerGreen:   '#00e5a0',
    timerYellow:  '#ffb347',
    timerRed:     '#ff5757',
    timerTrack:   '#1a1a3e',
    text:         '#e8e8f0',
    textMuted:    '#9999bb',
  };

  // --- Estado ---
  let canvas, ctx;
  let W, H;
  let holes = [];
  let score = 0;
  let timeLeft = GAME_DURATION;
  let gameState = 'idle'; // idle | running | over
  let rafId = null;
  let moleTimerId = null;
  let lastTs = 0;

  // --- DOM ---
  const scoreEl      = document.getElementById('score');
  const highscoreEl  = document.getElementById('highscore');
  const overlay      = document.getElementById('gameOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMsg   = document.getElementById('overlayMsg');
  const finalScoreEl = document.getElementById('finalScore');
  const startBtn     = document.getElementById('startBtn');
  const restartBtn   = document.getElementById('restartBtn');
  const playAgainBtn = document.getElementById('playAgainBtn');

  // --- Init ---
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    updateHighscoreDisplay();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('click', onPointer);
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onPointer(e.touches[0]);
    }, { passive: false });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    playAgainBtn.addEventListener('click', restartGame);

    drawIdleScreen();
  }

  // --- Canvas ---
  function resizeCanvas() {
    ({ width: W, height: H } = MiniJogos.resizeCanvas(canvas, 560, 1.1));
    buildHoles();
    if (gameState === 'running') render();
    else drawIdleScreen();
  }

  function buildHoles() {
    holes = [];
    const padX = W * 0.06;
    const padY = H * 0.06;
    const timerH = H * 0.1;
    const gridW = W - padX * 2;
    const gridH = H - padY * 2 - timerH;
    const cellW = gridW / COLS;
    const cellH = gridH / ROWS;
    const r = Math.min(cellW, cellH) * 0.32;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        holes.push({
          cx: padX + col * cellW + cellW / 2,
          cy: padY + row * cellH + cellH / 2,
          r,
          state: 'idle',  // idle | rising | up | falling | hit
          riseT: 0,       // 0..1 animation progress
          stayT: 0,       // seconds left visible
          hitT: 0,        // seconds left in hit flash
          gold: false,
          particles: [],
        });
      }
    }
  }

  // --- Input ---
  function onPointer(e) {
    if (gameState !== 'running') return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    const py = (e.clientY - rect.top) * (H / rect.height);

    for (const h of holes) {
      if (h.state !== 'up' && h.state !== 'rising') continue;
      const moleTopY = getMoleTopY(h);
      const moleCY = moleTopY + h.r * 0.65;
      if (Math.hypot(px - h.cx, py - moleCY) < h.r * 0.9) {
        whackMole(h);
        return;
      }
    }
  }

  function whackMole(h) {
    const pts = h.gold ? GOLD_POINTS : NORMAL_POINTS;
    score += pts;
    scoreEl.textContent = MiniJogos.formatScore(score);

    h.state = 'hit';
    h.hitT = 0.35;

    // Spawn score popup particles
    const moleTopY = getMoleTopY(h);
    const moleCY = moleTopY + h.r * 0.65;
    const color = h.gold ? C.particleGold : C.particle;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 80 + Math.random() * 180;
      h.particles.push({
        x: h.cx,
        y: moleCY,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 60,
        vy: Math.sin(angle) * speed - 80,
        life: 0.7,
        maxLife: 0.7,
        r: Math.random() * 4 + 2,
        color,
      });
    }

    // Score flash text particle
    h.particles.push({
      x: h.cx,
      y: moleCY - h.r * 0.5,
      vx: 0,
      vy: -60,
      life: 0.8,
      maxLife: 0.8,
      r: 0,
      color: h.gold ? C.particleGold : C.timerGreen,
      label: '+' + pts,
    });
  }

  // --- Game flow ---
  function startGame() {
    if (gameState === 'running') return;
    score = 0;
    timeLeft = GAME_DURATION;
    scoreEl.textContent = MiniJogos.formatScore(0);
    overlay.hidden = true;
    gameState = 'running';
    buildHoles();
    scheduleMole();
    lastTs = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function restartGame() {
    cancelAnimationFrame(rafId);
    clearTimeout(moleTimerId);
    gameState = 'idle';
    overlay.hidden = true;
    startGame();
  }

  function endGame() {
    gameState = 'over';
    cancelAnimationFrame(rafId);
    clearTimeout(moleTimerId);

    const isNew = MiniJogos.saveHighScore(GAME_ID, score);
    updateHighscoreDisplay();
    render();

    overlayTitle.textContent = 'Fim de Jogo!';
    finalScoreEl.textContent = MiniJogos.formatScore(score) + ' pontos';
    overlayMsg.textContent = isNew ? '🏆 Novo recorde!' : 'Tente superar seu recorde!';
    overlay.hidden = false;
  }

  // --- Mole spawning ---
  function scheduleMole() {
    if (gameState !== 'running') return;
    const elapsed = GAME_DURATION - timeLeft;
    const progress = Math.min(elapsed / GAME_DURATION, 0.9);
    const delay = Math.max(300, 1300 - progress * 1000) + (Math.random() - 0.5) * 350;
    moleTimerId = setTimeout(() => {
      if (gameState !== 'running') return;
      spawnMole();
      scheduleMole();
    }, delay);
  }

  function spawnMole() {
    const idle = holes.filter(h => h.state === 'idle');
    if (!idle.length) return;
    const h = idle[Math.floor(Math.random() * idle.length)];
    const elapsed = GAME_DURATION - timeLeft;
    const progress = Math.min(elapsed / GAME_DURATION, 0.85);
    h.state = 'rising';
    h.riseT = 0;
    h.gold = Math.random() < GOLD_CHANCE;
    h.stayT = Math.max(0.55, 1.5 - progress * 0.95);
    h.particles = [];
  }

  function getMoleTopY(h) {
    return h.cy - h.riseT * h.r * 1.35;
  }

  // --- Game loop ---
  function loop(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    timeLeft = Math.max(0, timeLeft - dt);
    update(dt);
    render();
    if (timeLeft <= 0) { endGame(); return; }
    rafId = requestAnimationFrame(loop);
  }

  function update(dt) {
    const RISE_SPD = 5;
    const FALL_SPD = 5.5;

    for (const h of holes) {
      // Particles
      h.particles = h.particles.filter(p => p.life > 0);
      for (const p of h.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (!p.label) p.vy += 420 * dt; // gravity for dot particles
        p.life -= dt;
      }

      switch (h.state) {
        case 'rising':
          h.riseT = Math.min(1, h.riseT + dt * RISE_SPD);
          if (h.riseT >= 1) h.state = 'up';
          break;
        case 'up':
          h.stayT -= dt;
          if (h.stayT <= 0) h.state = 'falling';
          break;
        case 'falling':
          h.riseT = Math.max(0, h.riseT - dt * FALL_SPD);
          if (h.riseT <= 0) { h.state = 'idle'; h.riseT = 0; }
          break;
        case 'hit':
          h.hitT -= dt;
          h.riseT = Math.max(0, h.riseT - dt * FALL_SPD * 2);
          if (h.hitT <= 0 || h.riseT <= 0) { h.state = 'idle'; h.riseT = 0; }
          break;
      }
    }
  }

  // --- Rendering ---
  function render() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    for (const h of holes) drawHoleAndMole(h);

    // Particles drawn above everything
    for (const h of holes) {
      for (const p of h.particles) {
        const a = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = a;
        if (p.label) {
          ctx.fillStyle = p.color;
          ctx.font = `bold ${Math.round(h.r * 0.55)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.label, p.x, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    if (gameState === 'running') drawTimer();
  }

  function drawHoleAndMole(h) {
    const { cx, cy, r } = h;
    const ry = r * 0.38;

    // Drop shadow
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.9, r + 4, ry * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.holeShadow;
    ctx.fill();

    // Hole interior
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.holeBg;
    ctx.fill();

    // Mole clipped to above hole center-line (cy)
    if (h.state !== 'idle' && h.riseT > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - r * 2.2, 0, r * 4.4, cy);
      ctx.clip();
      drawMole(h, ry);
      ctx.restore();
    }

    // Lower half cover: hides mole body below hole rim
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI); // 0→π sweeps the bottom arc (clockwise)
    ctx.closePath();
    ctx.fillStyle = C.bg;
    ctx.fill();

    // Hole rim
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = C.holeRim;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawMole(h, ry) {
    const { cx, cy, r } = h;
    const isHit = h.state === 'hit';
    const isGold = h.gold;
    const topY = getMoleTopY(h);
    const hR = r * 0.62;
    const headCY = topY + hR;

    const bodyColor = isHit ? C.moleHit  : isGold ? C.moleGold  : C.moleBody;
    const darkColor = isHit ? C.moleHitDark : isGold ? C.moleGoldDark : C.moleDark;

    // Body (torso behind head)
    ctx.beginPath();
    ctx.ellipse(cx, headCY + hR * 0.25, hR * 0.68, hR * 1.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = darkColor;
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(cx, headCY, hR, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();

    if (isHit) {
      // Stars on hit
      ctx.fillStyle = '#ffff44';
      ctx.font = `bold ${Math.round(hR * 0.62)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', cx - hR * 0.65, headCY - hR * 0.75);
      ctx.fillText('★', cx + hR * 0.65, headCY - hR * 0.75);
    } else {
      const eyeY = headCY - hR * 0.1;
      const eyeX = hR * 0.31;

      // Eyes
      ctx.fillStyle = '#180e04';
      ctx.beginPath();
      ctx.arc(cx - eyeX, eyeY, hR * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + eyeX, eyeY, hR * 0.14, 0, Math.PI * 2);
      ctx.fill();

      // Eye shine
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(cx - eyeX + hR * 0.05, eyeY - hR * 0.05, hR * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + eyeX + hR * 0.05, eyeY - hR * 0.05, hR * 0.055, 0, Math.PI * 2);
      ctx.fill();

      // Nose
      ctx.fillStyle = isGold ? '#7a4a0a' : '#d96e20';
      ctx.beginPath();
      ctx.ellipse(cx, eyeY + hR * 0.3, hR * 0.12, hR * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cheek blush
      ctx.fillStyle = 'rgba(220,130,60,0.28)';
      ctx.beginPath();
      ctx.arc(cx - hR * 0.47, eyeY + hR * 0.22, hR * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + hR * 0.47, eyeY + hR * 0.22, hR * 0.2, 0, Math.PI * 2);
      ctx.fill();

      if (isGold) {
        // Sparkle ring for golden mole
        ctx.strokeStyle = 'rgba(245,200,66,0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, headCY, hR * 1.18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function drawTimer() {
    const bW = W * 0.76;
    const bH = 10;
    const bX = (W - bW) / 2;
    const bY = H - H * 0.065;
    const ratio = timeLeft / GAME_DURATION;

    // Track
    ctx.fillStyle = C.timerTrack;
    drawRoundRect(bX, bY, bW, bH, 5);
    ctx.fill();

    // Fill
    const fillW = bW * ratio;
    if (fillW > 5) {
      ctx.fillStyle = ratio > 0.5 ? C.timerGreen : ratio > 0.25 ? C.timerYellow : C.timerRed;
      drawRoundRect(bX, bY, fillW, bH, 5);
      ctx.fill();
    }

    // Time text
    ctx.fillStyle = ratio < 0.25 ? C.timerRed : C.text;
    ctx.font = `bold ${Math.round(W * 0.037)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(Math.ceil(timeLeft) + 's', W / 2, bY - 5);
  }

  function drawIdleScreen() {
    if (!canvas) return;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    for (const h of holes) {
      const { cx, cy, r } = h;
      const ry = r * 0.38;
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.9, r + 4, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.holeShadow;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.holeBg;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = C.holeRim;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(15,15,35,0.72)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.text;
    ctx.font = `bold ${Math.round(W * 0.072)}px sans-serif`;
    ctx.fillText('Whack-a-Mole', W / 2, H / 2 - H * 0.065);
    ctx.fillStyle = C.textMuted;
    ctx.font = `${Math.round(W * 0.038)}px sans-serif`;
    ctx.fillText('Pressione "Iniciar" para comecar!', W / 2, H / 2 + H * 0.04);
  }

  // --- Helpers ---
  function drawRoundRect(x, y, w, h, r) {
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

  function updateHighscoreDisplay() {
    if (highscoreEl) {
      highscoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore(GAME_ID));
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
