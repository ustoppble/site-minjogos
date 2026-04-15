/* ============================================
   TEMPLATE DE JOGO — Mini Jogos
   Substituir pela logica do jogo
   ============================================ */

class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = document.getElementById('score');
    this.score = 0;
    this.isRunning = false;
    this.animationId = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const parent = this.canvas.parentElement;
    const size = Math.min(parent.clientWidth - 32, 500);
    this.canvas.width = size;
    this.canvas.height = size;
    if (!this.isRunning) this.drawIdle();
  }

  drawIdle() {
    const { ctx, canvas } = this;
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-surface').trim() || '#2a2a5a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9999bb';
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Clique em "Iniciar" para jogar', canvas.width / 2, canvas.height / 2);
  }

  start() {
    this.score = 0;
    this.updateScore();
    this.isRunning = true;
    this.loop();
  }

  loop() {
    if (!this.isRunning) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  update() {
    // Logica de atualizacao do jogo
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Logica de desenho do jogo
  }

  updateScore() {
    if (this.scoreEl) {
      this.scoreEl.textContent = MiniJogos.formatScore(this.score);
    }
  }

  gameOver() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    // MiniJogos.saveHighScore('GAME_ID', this.score);
  }

  restart() {
    this.gameOver();
    this.start();
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game('gameCanvas');

  document.getElementById('startBtn')?.addEventListener('click', () => {
    game.start();
  });

  document.getElementById('restartBtn')?.addEventListener('click', () => {
    game.restart();
  });
});
