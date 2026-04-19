/* ============================================
   WHACK-A-MOLE — Mini Jogos
   ============================================ */

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

class WhackAMoleGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = document.getElementById('score');
    this.highScoreEl = document.getElementById('highScore');

    this.score = 0;
    this.highScore = MiniJogos.getHighScore('whack-a-mole');
    this.isRunning = false;
    this.animationId = null;
    this.lastTimestamp = null;

    this.GRID = 3;
    this.N = this.GRID * this.GRID;
    this.GAME_DURATION = 60;
    this.timeLeft = this.GAME_DURATION;

    this.moles = [];
    this.particles = [];
    this.floatingScores = [];

    this.initMoles();
    this.resize();
    this.updateHighScoreDisplay();

    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.tryHit(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY
      );
    });
  }

  initMoles() {
    this.moles = Array.from({ length: this.N }, (_, i) => ({
      id: i,
      state: 'hidden', // hidden | rising | visible | falling | whacked
      anim: 0,         // 0→1 animation progress within current state
      visTimer: 0,     // countdown while visible
      delay: 0,        // countdown before rising from hidden
    }));
  }

  resize() {
    const parent = this.canvas.parentElement;
    const size = Math.min(parent.clientWidth - 16, 560);
    this.canvas.width = size;
    this.canvas.height = size;
    this.computeLayout();
    if (!this.isRunning) this.drawIdle();
  }

  computeLayout() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const hudH = H * 0.12;
    const gridPad = W * 0.06;
    const gridW = W - gridPad * 2;
    const gridH = H - hudH - gridPad * 0.5;
    const cellW = gridW / this.GRID;
    const cellH = gridH / this.GRID;

    this.layout = {
      hudH,
      gridPad,
      cellW,
      cellH,
      holeRx: cellW * 0.34,
      holeRy: cellH * 0.11,
      moleR: Math.min(cellW, cellH) * 0.28,
    };
  }

  // Returns canvas coords of the hole center for mole i
  holePosOf(i) {
    const { hudH, gridPad, cellW, cellH } = this.layout;
    const row = Math.floor(i / this.GRID);
    const col = i % this.GRID;
    return {
      cx: gridPad + col * cellW + cellW / 2,
      hy: hudH + gridPad * 0.5 + row * cellH + cellH * 0.72,
    };
  }

  // Returns the Y canvas coordinate of the mole's center circle (null if fully hidden)
  moleYOf(mole) {
    const { hy } = this.holePosOf(mole.id);
    const { holeRy, moleR } = this.layout;
    const visibleY = hy - holeRy - moleR; // mole center when fully out
    const hiddenY  = hy + moleR;           // mole center when fully in

    let t;
    switch (mole.state) {
      case 'hidden':  return null;
      case 'rising':  t = easeInOut(mole.anim); break;
      case 'visible': t = 1; break;
      case 'falling': t = easeInOut(1 - mole.anim); break;
      case 'whacked': t = easeInOut(1 - mole.anim * 0.55); break;
      default:        return null;
    }
    return hiddenY + (visibleY - hiddenY) * t;
  }

  // --- Game Flow ---

  start() {
    cancelAnimationFrame(this.animationId);
    this.score = 0;
    this.timeLeft = this.GAME_DURATION;
    this.isRunning = true;
    this.lastTimestamp = null;
    this.particles = [];
    this.floatingScores = [];

    this.initMoles();
    // Stagger first moles so they don't all pop at once
    this.moles.forEach((m, i) => {
      m.delay = 0.4 + i * 0.15 + Math.random() * 0.5;
    });

    this.updateScoreDisplay();
    document.getElementById('gameOverlay').hidden = true;

    this.animationId = requestAnimationFrame(ts => this.loop(ts));
  }

  loop(ts) {
    if (!this.isRunning) return;
    if (this.lastTimestamp === null) this.lastTimestamp = ts;
    const dt = Math.min((ts - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = ts;
    this.update(dt);
    this.draw();
    this.animationId = requestAnimationFrame(ts2 => this.loop(ts2));
  }

  update(dt) {
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft === 0) {
      this.endGame();
      return;
    }

    // Difficulty factor 0 (start) → 1 (end)
    const diff = 1 - this.timeLeft / this.GAME_DURATION;

    const RISE_SPEED  = 2.8;
    const FALL_SPEED  = 3.5;
    const WHACK_SPEED = 5.5;

    this.moles.forEach(m => {
      switch (m.state) {
        case 'hidden':
          if (m.delay > 0) {
            m.delay -= dt;
            if (m.delay <= 0) {
              m.state = 'rising';
              m.anim = 0;
            }
          }
          break;

        case 'rising':
          m.anim = Math.min(1, m.anim + dt * RISE_SPEED);
          if (m.anim >= 1) {
            m.state = 'visible';
            // Visible duration shrinks as difficulty rises (2s → 0.55s)
            const base = Math.max(0.55, 2.0 - diff * 1.45);
            m.visTimer = base * (0.7 + Math.random() * 0.6);
          }
          break;

        case 'visible':
          m.visTimer -= dt;
          if (m.visTimer <= 0) {
            m.state = 'falling';
            m.anim = 0;
          }
          break;

        case 'falling':
          m.anim = Math.min(1, m.anim + dt * FALL_SPEED);
          if (m.anim >= 1) {
            m.state = 'hidden';
            // Delay before next pop shrinks as difficulty rises (1.8s → 0.3s)
            const base = Math.max(0.3, 1.8 - diff * 1.5);
            m.delay = base * (0.5 + Math.random() * 0.8);
          }
          break;

        case 'whacked':
          m.anim = Math.min(1, m.anim + dt * WHACK_SPEED);
          if (m.anim >= 1) {
            m.state = 'hidden';
            const base = Math.max(0.25, 1.4 - diff * 1.1);
            m.delay = base * (0.5 + Math.random() * 0.7);
          }
          break;
      }
    });

    // Particles
    this.particles = this.particles.filter(p => {
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += 420 * dt; // gravity
      p.life -= dt;
      return p.life > 0;
    });

    // Floating score texts
    this.floatingScores = this.floatingScores.filter(f => {
      f.y -= 65 * dt;
      f.life -= dt;
      return f.life > 0;
    });
  }

  // --- Drawing ---

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawBackground();
    this.drawHolesBack();

    // Bottom rows on top for depth illusion (painter's algorithm)
    [...this.moles]
      .sort((a, b) => Math.floor(a.id / this.GRID) - Math.floor(b.id / this.GRID))
      .forEach(m => this.drawMole(m));

    this.drawHolesFront();
    this.drawParticles();
    this.drawFloatingScores();
    this.drawHUD();
  }

  drawBackground() {
    const { ctx, canvas } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0f0f23');
    grad.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawHolesBack() {
    const { ctx } = this;
    const { holeRx, holeRy } = this.layout;

    for (let i = 0; i < this.N; i++) {
      const { cx, hy } = this.holePosOf(i);

      // Ground mound — soft radial gradient to suggest soil
      const moundGrad = ctx.createRadialGradient(cx, hy, 0, cx, hy, holeRx * 1.7);
      moundGrad.addColorStop(0,   '#263320');
      moundGrad.addColorStop(0.6, '#1a2414');
      moundGrad.addColorStop(1,   'rgba(15,15,35,0)');
      ctx.fillStyle = moundGrad;
      ctx.beginPath();
      ctx.ellipse(cx, hy, holeRx * 1.75, holeRy * 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hole interior — dark ellipse
      const holeGrad = ctx.createRadialGradient(cx, hy - holeRy * 0.4, 0, cx, hy, holeRx);
      holeGrad.addColorStop(0, '#050510');
      holeGrad.addColorStop(1, '#0a0a1e');
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.ellipse(cx, hy, holeRx, holeRy, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rim highlight — top arc only
      ctx.strokeStyle = 'rgba(120,120,220,0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, hy, holeRx, holeRy, 0, Math.PI, 0); // top half arc
      ctx.stroke();
    }
  }

  drawHolesFront() {
    const { ctx } = this;
    const { holeRx, holeRy } = this.layout;

    for (let i = 0; i < this.N; i++) {
      const { cx, hy } = this.holePosOf(i);

      // Front lip — bottom arc of the ground mound drawn on top of moles
      const lipGrad = ctx.createLinearGradient(cx, hy, cx, hy + holeRy * 2);
      lipGrad.addColorStop(0, '#2a3820');
      lipGrad.addColorStop(1, '#1a2414');
      ctx.fillStyle = lipGrad;
      ctx.beginPath();
      ctx.ellipse(cx, hy, holeRx * 1.18, holeRy * 1.35, 0, 0, Math.PI); // bottom half
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, hy, holeRx * 1.18, holeRy * 1.35, 0, 0, Math.PI);
      ctx.stroke();
    }
  }

  drawMole(mole) {
    const my = this.moleYOf(mole);
    if (my === null) return;

    const { ctx } = this;
    const { cx, hy } = this.holePosOf(mole.id);
    const { holeRy, moleR } = this.layout;
    const clipBottom = hy - holeRy * 0.85; // clip mole just above hole rim

    ctx.save();
    // Clip so mole cannot appear below the hole rim
    ctx.beginPath();
    ctx.rect(cx - moleR * 1.9, 0, moleR * 3.8, clipBottom);
    ctx.clip();

    const isWhacked = mole.state === 'whacked';
    const mainColor = isWhacked ? '#ff5757' : '#7c5cff';
    const hiColor   = isWhacked ? '#ff9090' : '#a07fff';

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, my + moleR * 0.92, moleR * 0.75, moleR * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const bodyGrad = ctx.createRadialGradient(
      cx - moleR * 0.28, my - moleR * 0.28, moleR * 0.05,
      cx, my, moleR
    );
    bodyGrad.addColorStop(0, hiColor);
    bodyGrad.addColorStop(1, mainColor);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, my, moleR, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    const earR = moleR * 0.22;
    ctx.fillStyle = isWhacked ? '#cc3333' : '#5a3acc';
    ctx.beginPath();
    ctx.arc(cx - moleR * 0.62, my - moleR * 0.62, earR, 0, Math.PI * 2);
    ctx.arc(cx + moleR * 0.62, my - moleR * 0.62, earR, 0, Math.PI * 2);
    ctx.fill();

    // Inner ear
    ctx.fillStyle = isWhacked ? '#ff8888' : '#9977ff';
    ctx.beginPath();
    ctx.arc(cx - moleR * 0.62, my - moleR * 0.62, earR * 0.55, 0, Math.PI * 2);
    ctx.arc(cx + moleR * 0.62, my - moleR * 0.62, earR * 0.55, 0, Math.PI * 2);
    ctx.fill();

    if (isWhacked) {
      this.drawXEyes(ctx, cx, my, moleR);
    } else {
      this.drawFace(ctx, cx, my, moleR);
    }

    ctx.restore();
  }

  drawFace(ctx, cx, cy, r) {
    const ex = r * 0.28;
    const ey = -r * 0.08;
    const er = r * 0.11;

    // Eyes
    ctx.fillStyle = '#0f0f23';
    ctx.beginPath();
    ctx.arc(cx - ex, cy + ey, er, 0, Math.PI * 2);
    ctx.arc(cx + ex, cy + ey, er, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.beginPath();
    ctx.arc(cx - ex + er * 0.38, cy + ey - er * 0.38, er * 0.4, 0, Math.PI * 2);
    ctx.arc(cx + ex + er * 0.38, cy + ey - er * 0.38, er * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#c07090';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.22, r * 0.2, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#0f0f23';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.16, r * 0.07, r * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#0f0f23';
    ctx.lineWidth = r * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.27, r * 0.11, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }

  drawXEyes(ctx, cx, cy, r) {
    const ex = r * 0.28;
    const ey = -r * 0.08;
    const es = r * 0.12;

    ctx.strokeStyle = '#0f0f23';
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(cx - ex - es, cy + ey - es);
    ctx.lineTo(cx - ex + es, cy + ey + es);
    ctx.moveTo(cx - ex + es, cy + ey - es);
    ctx.lineTo(cx - ex - es, cy + ey + es);
    ctx.moveTo(cx + ex - es, cy + ey - es);
    ctx.lineTo(cx + ex + es, cy + ey + es);
    ctx.moveTo(cx + ex + es, cy + ey - es);
    ctx.lineTo(cx + ex - es, cy + ey + es);
    ctx.stroke();
  }

  drawParticles() {
    const { ctx } = this;
    this.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  drawFloatingScores() {
    const { ctx } = this;
    this.floatingScores.forEach(f => {
      ctx.globalAlpha = Math.min(1, f.life * 3);
      ctx.fillStyle = '#00e5a0';
      ctx.font = `bold ${f.size}px 'IBM Plex Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;
  }

  drawHUD() {
    const { ctx, canvas } = this;
    const { hudH } = this.layout;
    const pct = this.timeLeft / this.GAME_DURATION;

    const barX = canvas.width * 0.1;
    const barW = canvas.width * 0.8;
    const barY = hudH * 0.22;
    const barH = hudH * 0.24;
    const r    = barH / 2;

    // Bar background
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    this.fillRoundRect(barX, barY, barW, barH, r);

    // Bar fill — colour shifts from green → amber → red
    const barColor = pct > 0.5 ? '#00e5a0' : pct > 0.25 ? '#ffb347' : '#ff5757';
    ctx.fillStyle = barColor;
    this.fillRoundRect(barX, barY, Math.max(r * 2, barW * pct), barH, r);

    // Seconds remaining
    const secs = Math.ceil(this.timeLeft);
    ctx.fillStyle = this.timeLeft <= 10 ? '#ff5757' : '#e8e8f0';
    ctx.font = `600 ${hudH * 0.38}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${secs}s`, canvas.width / 2, hudH * 0.92);

    // High score hint (left side)
    ctx.fillStyle = '#9999bb';
    ctx.font = `${hudH * 0.27}px 'IBM Plex Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`REC: ${MiniJogos.formatScore(this.highScore)}`, canvas.width * 0.1, hudH * 0.9);
  }

  fillRoundRect(x, y, w, h, r) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
    ctx.fill();
  }

  drawIdle() {
    this.drawBackground();
    this.drawHolesBack();
    this.drawHolesFront();

    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(10,10,30,0.52)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#e8e8f0';
    ctx.font = `bold ${canvas.width * 0.065}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Whack-a-Mole', canvas.width / 2, canvas.height * 0.44);

    ctx.fillStyle = '#9999bb';
    ctx.font = `${canvas.width * 0.038}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText('Clique em "Iniciar" para jogar', canvas.width / 2, canvas.height * 0.55);
  }

  // --- Input ---

  tryHit(px, py) {
    if (!this.isRunning) return;
    const { moleR } = this.layout;

    for (const mole of this.moles) {
      if (mole.state !== 'visible' && mole.state !== 'rising') continue;
      const my = this.moleYOf(mole);
      if (my === null) continue;
      const { cx } = this.holePosOf(mole.id);
      if (Math.hypot(px - cx, py - my) < moleR * 1.3) {
        this.whack(mole, cx, my);
        return;
      }
    }
  }

  whack(mole, cx, my) {
    mole.state = 'whacked';
    mole.anim  = 0;

    this.score += 10;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.updateHighScoreDisplay();
    }
    this.updateScoreDisplay();

    // Burst particles
    const COLORS = ['#00e5a0', '#7c5cff', '#ffb347', '#ff5757', '#e8e8f0'];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 160;
      this.particles.push({
        x: cx, y: my,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 90,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        r: 2.5 + Math.random() * 3.5,
        life: 0.7 + Math.random() * 0.4,
      });
    }

    // Floating "+10" label
    this.floatingScores.push({
      x: cx,
      y: my - this.layout.moleR,
      text: '+10',
      size: this.canvas.width * 0.056,
      life: 0.75,
    });
  }

  // --- UI Updates ---

  updateScoreDisplay() {
    if (this.scoreEl) this.scoreEl.textContent = MiniJogos.formatScore(this.score);
  }

  updateHighScoreDisplay() {
    if (this.highScoreEl) this.highScoreEl.textContent = MiniJogos.formatScore(this.highScore);
  }

  endGame() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationId);

    const isNewRecord = MiniJogos.saveHighScore('whack-a-mole', this.score);
    if (isNewRecord) {
      this.highScore = this.score;
      this.updateHighScoreDisplay();
    }

    // Render final frame before showing overlay
    this.draw();

    const overlay = document.getElementById('gameOverlay');
    const finalScoreEl = document.getElementById('finalScore');
    if (overlay) overlay.hidden = false;
    if (finalScoreEl) {
      finalScoreEl.textContent = isNewRecord
        ? `${this.score} pts — Novo Recorde!`
        : `${this.score} pts`;
    }
    const titleEl = overlay?.querySelector('.game-overlay-title');
    if (titleEl) titleEl.textContent = 'Fim de Jogo!';
  }

  restart() {
    this.start();
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  const game = new WhackAMoleGame('gameCanvas');

  document.getElementById('startBtn').addEventListener('click', () => game.start());
  document.getElementById('restartBtn').addEventListener('click', () => game.restart());
  document.getElementById('playAgainBtn')?.addEventListener('click', () => game.restart());
});
