/* ============================================
   FLAPPY BIRD — Mini Jogos
   Canvas 320x480 (portrait), responsivo
   ============================================ */

const GAME_W = 320;
const GAME_H = 480;

// Constantes do jogo
const GRAVITY        = 0.45;
const FLAP_IMPULSE   = -8.5;
const PIPE_SPEED     = 2.4;
const PIPE_WIDTH     = 52;
const PIPE_GAP       = 130;
const PIPE_INTERVAL  = 90;   // frames entre pipes
const GROUND_HEIGHT  = 56;
const BIRD_X        = 72;
const BIRD_R        = 14;    // raio do pássaro

// Cores (alinhadas ao design system)
const COLOR_SKY_TOP    = '#0f0f23';
const COLOR_SKY_BTN    = '#1a1a3e';
const COLOR_PIPE       = '#00e5a0';
const COLOR_PIPE_DARK  = '#00b87f';
const COLOR_PIPE_CAP   = '#00c98b';
const COLOR_BIRD       = '#ffb347';
const COLOR_BIRD_EYE   = '#0f0f23';
const COLOR_BIRD_WING  = '#ff8c00';
const COLOR_GROUND     = '#2a2a5a';
const COLOR_GROUND_TOP = '#3a3a6a';
const COLOR_SCORE_TXT  = '#e8e8f0';
const COLOR_ACCENT     = '#7c5cff';

class FlappyBird {
  constructor(canvasId) {
    this.canvas    = document.getElementById(canvasId);
    this.ctx       = this.canvas.getContext('2d');
    this.scoreEl   = document.getElementById('score');
    this.hsEl      = document.getElementById('highscore');

    // Estado interno
    this.state     = 'idle';   // idle | playing | dead
    this.score     = 0;
    this.animId    = null;
    this.frameCount = 0;

    // Pássaro
    this.bird = { y: 0, vy: 0, angle: 0 };

    // Canos
    this.pipes = [];

    // Chão (scroll)
    this.groundX = 0;

    // Partículas (score pop)
    this.particles = [];

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Controles
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this._handleInput();
      }
    });
    this.canvas.addEventListener('click',      () => this._handleInput());
    this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this._handleInput(); }, { passive: false });

    this._updateHighscoreDisplay();
    this._drawIdle();
  }

  // ---------------------------------------------------
  // Responsividade
  // ---------------------------------------------------
  resize() {
    const wrapper = this.canvas.parentElement;
    const maxW    = Math.min(wrapper.clientWidth - 32, 360);
    // Mantém proporção portrait 320:480
    this.scale    = maxW / GAME_W;
    this.canvas.width  = maxW;
    this.canvas.height = maxW * (GAME_H / GAME_W);

    if (this.state !== 'playing') this._drawIdle();
  }

  // ---------------------------------------------------
  // Input unificado
  // ---------------------------------------------------
  _handleInput() {
    if (this.state === 'idle') {
      this.start();
    } else if (this.state === 'playing') {
      this._flap();
    } else if (this.state === 'dead') {
      this.restart();
    }
  }

  // ---------------------------------------------------
  // Iniciar / Reiniciar
  // ---------------------------------------------------
  start() {
    this.score      = 0;
    this.frameCount = 0;
    this.pipes      = [];
    this.particles  = [];
    this.groundX    = 0;
    this.bird       = { y: GAME_H / 2 - 40, vy: 0, angle: 0 };
    this.state      = 'playing';
    this._updateScoreDisplay();
    if (this.animId) cancelAnimationFrame(this.animId);
    this._loop();
  }

  restart() {
    this.start();
  }

  // ---------------------------------------------------
  // Loop principal
  // ---------------------------------------------------
  _loop() {
    this._update();
    this._draw();
    if (this.state === 'playing' || this.state === 'dead') {
      this.animId = requestAnimationFrame(() => this._loop());
    }
  }

  // ---------------------------------------------------
  // Update
  // ---------------------------------------------------
  _update() {
    if (this.state !== 'playing') return;

    this.frameCount++;

    // Física do pássaro
    this.bird.vy    += GRAVITY;
    this.bird.y     += this.bird.vy;
    this.bird.angle  = Math.max(-30, Math.min(90, this.bird.vy * 5));

    // Chão scroll
    this.groundX = (this.groundX - PIPE_SPEED) % 40;

    // Gerar canos
    if (this.frameCount % PIPE_INTERVAL === 0) {
      this._spawnPipe();
    }

    // Mover canos
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= PIPE_SPEED;

      // Score: pássaro passou pelo cano
      if (!p.scored && p.x + PIPE_WIDTH < BIRD_X - BIRD_R) {
        p.scored = true;
        this.score++;
        this._updateScoreDisplay();
        this._spawnScoreParticles();
      }

      // Remover canos fora da tela
      if (p.x + PIPE_WIDTH < 0) {
        this.pipes.splice(i, 1);
      }
    }

    // Atualizar partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x  += pt.vx;
      pt.y  += pt.vy;
      pt.vy += 0.15;
      pt.life--;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    // Colisão
    if (this._checkCollision()) {
      this._die();
    }
  }

  // ---------------------------------------------------
  // Spawn de cano
  // ---------------------------------------------------
  _spawnPipe() {
    const minTop = 60;
    const maxTop = GAME_H - GROUND_HEIGHT - PIPE_GAP - 60;
    const topH   = minTop + Math.random() * (maxTop - minTop);
    this.pipes.push({ x: GAME_W, topH, scored: false });
  }

  // ---------------------------------------------------
  // Flap
  // ---------------------------------------------------
  _flap() {
    this.bird.vy = FLAP_IMPULSE;
  }

  // ---------------------------------------------------
  // Colisão
  // ---------------------------------------------------
  _checkCollision() {
    const bx = BIRD_X;
    const by = this.bird.y;
    const r  = BIRD_R - 2; // hitbox ligeiramente menor (mais justo)

    // Chão e teto
    if (by - r <= 0) return true;
    if (by + r >= GAME_H - GROUND_HEIGHT) return true;

    // Canos
    for (const p of this.pipes) {
      const px  = p.x;
      const pw  = PIPE_WIDTH;
      const gap = PIPE_GAP;

      // AABB aproximada com círculo
      if (bx + r > px && bx - r < px + pw) {
        if (by - r < p.topH || by + r > p.topH + gap) {
          return true;
        }
      }
    }

    return false;
  }

  // ---------------------------------------------------
  // Game Over
  // ---------------------------------------------------
  _die() {
    this.state = 'dead';
    const isNew = MiniJogos.saveHighScore('flappy-bird', this.score);
    this._updateHighscoreDisplay();
    // Continua loop para mostrar game-over overlay desenhado no canvas
  }

  // ---------------------------------------------------
  // Partículas de score
  // ---------------------------------------------------
  _spawnScoreParticles() {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x:    BIRD_X,
        y:    this.bird.y,
        vx:   (Math.random() - 0.5) * 3,
        vy:   (Math.random() - 0.5) * 3 - 1,
        life: 28 + Math.floor(Math.random() * 12),
        r:    2 + Math.random() * 3,
        color: Math.random() > 0.5 ? COLOR_ACCENT : COLOR_PIPE,
      });
    }
  }

  // ---------------------------------------------------
  // Draw
  // ---------------------------------------------------
  _draw() {
    const { ctx, canvas, scale } = this;
    const W = GAME_W;
    const H = GAME_H;

    ctx.save();
    ctx.scale(scale, scale);

    // Fundo gradiente
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   COLOR_SKY_TOP);
    grad.addColorStop(1,   COLOR_SKY_BTN);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Estrelas (estáticas, baseadas em seed)
    this._drawStars(ctx, W, H);

    // Canos
    this._drawPipes(ctx, H);

    // Partículas
    for (const pt of this.particles) {
      ctx.globalAlpha = pt.life / 40;
      ctx.fillStyle   = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Chão
    this._drawGround(ctx, W, H);

    // Pássaro
    this._drawBird(ctx);

    // HUD - score no canvas
    ctx.fillStyle    = COLOR_SCORE_TXT;
    ctx.font         = 'bold 22px "JetBrains Mono", monospace';
    ctx.textAlign    = 'center';
    ctx.shadowColor  = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur   = 6;
    ctx.fillText(this.score, W / 2, 44);
    ctx.shadowBlur   = 0;

    // Game over overlay
    if (this.state === 'dead') {
      this._drawGameOver(ctx, W, H);
    }

    // Idle overlay
    if (this.state === 'idle') {
      this._drawIdleOverlay(ctx, W, H);
    }

    ctx.restore();
  }

  // ---------------------------------------------------
  // Estrelas decorativas
  // ---------------------------------------------------
  _drawStars(ctx, W, H) {
    const stars = [
      [30, 40], [90, 20], [150, 55], [220, 15], [280, 35],
      [60, 80], [180, 70], [250, 90], [310, 60], [20, 100],
      [130, 110], [200, 105], [270, 120], [50, 130], [310, 140],
    ];
    ctx.fillStyle = 'rgba(232,232,240,0.35)';
    for (const [sx, sy] of stars) {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------------------------------------------------
  // Canos
  // ---------------------------------------------------
  _drawPipes(ctx, H) {
    for (const p of this.pipes) {
      const { x, topH } = p;
      const bottomY = topH + PIPE_GAP;
      const capH    = 16;
      const capW    = PIPE_WIDTH + 8;
      const capX    = x - 4;

      // Cano superior (corpo)
      this._drawPipeRect(ctx, x, 0, PIPE_WIDTH, topH - capH);

      // Cano superior (cap)
      this._drawPipeRect(ctx, capX, topH - capH, capW, capH, true);

      // Cano inferior (cap)
      this._drawPipeRect(ctx, capX, bottomY, capW, capH, true);

      // Cano inferior (corpo)
      this._drawPipeRect(ctx, x, bottomY + capH, PIPE_WIDTH, H - bottomY - capH);
    }
  }

  _drawPipeRect(ctx, x, y, w, h, isCap = false) {
    const radius = isCap ? 4 : 2;

    // Sombra leve
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur  = 4;

    // Corpo base
    ctx.fillStyle = isCap ? COLOR_PIPE_CAP : COLOR_PIPE;
    this._roundRect(ctx, x, y, w, h, radius);

    ctx.shadowBlur = 0;

    // Highlight lateral esquerdo
    const hlGrad = ctx.createLinearGradient(x, y, x + w, y);
    hlGrad.addColorStop(0,   'rgba(255,255,255,0.18)');
    hlGrad.addColorStop(0.4, 'rgba(255,255,255,0.04)');
    hlGrad.addColorStop(1,   'rgba(0,0,0,0.15)');
    ctx.fillStyle = hlGrad;
    this._roundRect(ctx, x, y, w, h, radius);

    // Borda
    ctx.strokeStyle = COLOR_PIPE_DARK;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, radius) : ctx.rect(x, y, w, h);
    ctx.stroke();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.fill();
  }

  // ---------------------------------------------------
  // Chão
  // ---------------------------------------------------
  _drawGround(ctx, W, H) {
    const gy = H - GROUND_HEIGHT;

    // Faixa superior do chão
    ctx.fillStyle = COLOR_GROUND_TOP;
    ctx.fillRect(0, gy, W, 6);

    // Corpo do chão
    ctx.fillStyle = COLOR_GROUND;
    ctx.fillRect(0, gy + 6, W, GROUND_HEIGHT - 6);

    // Linhas decorativas (scrolling)
    ctx.strokeStyle = 'rgba(58,58,106,0.6)';
    ctx.lineWidth   = 1;
    const segW = 40;
    for (let gx = this.groundX; gx < W + segW; gx += segW) {
      ctx.beginPath();
      ctx.moveTo(gx, gy + 6);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
  }

  // ---------------------------------------------------
  // Pássaro
  // ---------------------------------------------------
  _drawBird(ctx) {
    const bx = BIRD_X;
    const by = this.bird.y;
    const r  = BIRD_R;
    const angleRad = (this.bird.angle * Math.PI) / 180;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angleRad);

    // Sombra
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur  = 6;
    ctx.shadowOffsetY = 2;

    // Corpo
    ctx.fillStyle = COLOR_BIRD;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Highlight
    const hlGrad = ctx.createRadialGradient(-3, -4, 1, 0, 0, r);
    hlGrad.addColorStop(0,   'rgba(255,255,255,0.45)');
    hlGrad.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Asa (triângulo arredondado abaixo/trás)
    ctx.fillStyle = COLOR_BIRD_WING;
    ctx.beginPath();
    ctx.ellipse(-3, 5, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Olho
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(5, -3, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLOR_BIRD_EYE;
    ctx.beginPath();
    ctx.arc(6, -3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Bico
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.moveTo(r - 2, -1);
    ctx.lineTo(r + 7, 1);
    ctx.lineTo(r - 2, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ---------------------------------------------------
  // Tela idle
  // ---------------------------------------------------
  _drawIdle() {
    const { ctx, canvas, scale } = this;
    const W = GAME_W;
    const H = GAME_H;

    ctx.save();
    ctx.scale(scale, scale);

    // BG
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, COLOR_SKY_TOP);
    grad.addColorStop(1, COLOR_SKY_BTN);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    this._drawStars(ctx, W, H);
    this._drawGround(ctx, W, H);

    // Pássaro centralizado
    this.bird.y     = H / 2 - 30;
    this.bird.angle = 0;
    this._drawBird(ctx);

    this._drawIdleOverlay(ctx, W, H);
    ctx.restore();
  }

  _drawIdleOverlay(ctx, W, H) {
    // Painel semi-transparente
    ctx.fillStyle = 'rgba(15,15,35,0.72)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(W / 2 - 110, H / 2 - 60, 220, 120, 12);
    } else {
      ctx.rect(W / 2 - 110, H / 2 - 60, 220, 120);
    }
    ctx.fill();

    ctx.textAlign = 'center';

    ctx.fillStyle = COLOR_BIRD;
    ctx.font      = 'bold 22px Inter, sans-serif';
    ctx.fillText('Flappy Bird', W / 2, H / 2 - 22);

    ctx.fillStyle = '#9999bb';
    ctx.font      = '13px Inter, sans-serif';
    ctx.fillText('Clique ou pressione Espaço', W / 2, H / 2 + 4);
    ctx.fillText('para começar!', W / 2, H / 2 + 22);

    // Seta pulsante (simulada)
    ctx.fillStyle = COLOR_ACCENT;
    ctx.font      = '18px Inter, sans-serif';
    ctx.fillText('▼ Iniciar', W / 2, H / 2 + 46);
  }

  // ---------------------------------------------------
  // Game Over overlay
  // ---------------------------------------------------
  _drawGameOver(ctx, W, H) {
    // Fundo escuro
    ctx.fillStyle = 'rgba(15,15,35,0.80)';
    ctx.fillRect(0, 0, W, H);

    // Painel
    const pw = 240;
    const ph = 180;
    const px = W / 2 - pw / 2;
    const py = H / 2 - ph / 2;

    ctx.fillStyle = '#1a1a3e';
    ctx.strokeStyle = '#3a3a6a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(px, py, pw, ph, 14);
    } else {
      ctx.rect(px, py, pw, ph);
    }
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';

    // Título
    ctx.fillStyle = '#ff5757';
    ctx.font      = 'bold 24px Inter, sans-serif';
    ctx.fillText('Game Over', W / 2, py + 38);

    // Score
    ctx.fillStyle = '#e8e8f0';
    ctx.font      = '14px Inter, sans-serif';
    ctx.fillText('Pontuação', W / 2, py + 68);

    ctx.fillStyle = COLOR_BIRD;
    ctx.font      = 'bold 32px "JetBrains Mono", monospace';
    ctx.fillText(this.score, W / 2, py + 100);

    // High score
    const hs = MiniJogos.getHighScore('flappy-bird');
    ctx.fillStyle = '#9999bb';
    ctx.font      = '12px Inter, sans-serif';
    ctx.fillText(`Recorde: ${hs}`, W / 2, py + 126);

    // Instrução reiniciar
    ctx.fillStyle = COLOR_ACCENT;
    ctx.font      = '13px Inter, sans-serif';
    ctx.fillText('Clique ou Espaço para jogar de novo', W / 2, py + 158);
  }

  // ---------------------------------------------------
  // UI external
  // ---------------------------------------------------
  _updateScoreDisplay() {
    if (this.scoreEl) {
      this.scoreEl.textContent = MiniJogos.formatScore(this.score);
    }
  }

  _updateHighscoreDisplay() {
    if (this.hsEl) {
      this.hsEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('flappy-bird'));
    }
  }
}

// ---------------------------------------------------
// Init
// ---------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const game = new FlappyBird('gameCanvas');

  document.getElementById('startBtn')?.addEventListener('click', () => {
    if (game.state === 'idle' || game.state === 'dead') {
      game.start();
    }
  });

  document.getElementById('restartBtn')?.addEventListener('click', () => {
    game.restart();
  });
});
