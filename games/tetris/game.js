/* ============================================
   TETRIS — Mini Jogos
   game.js — Lógica completa do jogo
   ============================================ */

(function () {
  'use strict';

  // --- Constantes ---
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 30; // será recalculado responsivamente
  const COLORS = {
    I: '#00e5a0',  // ciano/verde (accent)
    O: '#ffb347',  // amarelo (warning)
    T: '#7c5cff',  // roxo (primary)
    S: '#00d4ff',  // azul claro
    Z: '#ff5757',  // vermelho (danger)
    J: '#4a9eff',  // azul
    L: '#ff8c42',  // laranja
  };

  const GHOST_ALPHA = 0.25;

  // Tetrominós: cada peça é um array de rotações, cada rotação é uma matriz
  const TETROMINOS = {
    I: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ],
    O: [
      [[0,1,1,0],[0,1,1,0],[0,0,0,0]],
    ],
    T: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]],
    ],
    S: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]],
    ],
    Z: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]],
    ],
    J: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]],
    ],
    L: [
      [[0,0,1],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,0],[0,1,1]],
      [[0,0,0],[1,1,1],[1,0,0]],
      [[1,1,0],[0,1,0],[0,1,0]],
    ],
  };

  const PIECE_TYPES = Object.keys(TETROMINOS);

  // Pontuação por número de linhas simultâneas
  const LINE_SCORES = [0, 100, 300, 500, 800];

  // Intervalo de queda por nível (ms)
  function dropInterval(level) {
    return Math.max(100, 800 - (level - 1) * 70);
  }

  // --- Estado do Jogo ---
  let board = [];
  let currentPiece = null;
  let nextPiece = null;
  let score = 0;
  let level = 1;
  let linesCleared = 0;
  let gameRunning = false;
  let gamePaused = false;
  let gameOver = false;
  let lastTime = 0;
  let dropCounter = 0;
  let animFrameId = null;

  // --- Canvas ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('nextCanvas');
  const nextCtx = nextCanvas.getContext('2d');

  // --- UI ---
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const linesEl = document.getElementById('lines');
  const highScoreEl = document.getElementById('highScore');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const mobileControls = document.getElementById('mobileControls');

  // --- Responsividade ---
  function resizeGame() {
    const wrapper = canvas.parentElement;
    const maxWidth = wrapper.clientWidth - 32; // padding
    const blockSize = Math.floor(maxWidth / COLS);
    const w = blockSize * COLS;
    const h = blockSize * ROWS;

    canvas.width = w;
    canvas.height = h;
    canvas.dataset.blockSize = blockSize;

    // Next canvas: 4 blocos x 4 blocos
    const nb = Math.min(blockSize, 28);
    nextCanvas.width = nb * 4;
    nextCanvas.height = nb * 4;
    nextCanvas.dataset.blockSize = nb;

    if (gameRunning || gameOver) {
      drawBoard();
      drawNext();
    } else {
      drawIdleScreen();
    }
  }

  function getBlockSize() {
    return parseInt(canvas.dataset.blockSize) || 30;
  }

  function getNextBlockSize() {
    return parseInt(nextCanvas.dataset.blockSize) || 28;
  }

  // --- Inicialização do Tabuleiro ---
  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  // --- Peças ---
  function randomPiece() {
    const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    return {
      type,
      color: COLORS[type],
      rotation: 0,
      matrix: TETROMINOS[type][0],
      x: Math.floor(COLS / 2) - Math.floor(TETROMINOS[type][0][0].length / 2),
      y: 0,
    };
  }

  function getMatrix(piece, rotation) {
    const rots = TETROMINOS[piece.type];
    return rots[((rotation % rots.length) + rots.length) % rots.length];
  }

  // --- Colisão ---
  function collides(piece, matrix, offsetX, offsetY) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const newX = piece.x + offsetX + c;
        const newY = piece.y + offsetY + r;
        if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
        if (newY >= 0 && board[newY][newX]) return true;
      }
    }
    return false;
  }

  // --- Rotação (wall kick simples) ---
  function rotatePiece(piece, dir) {
    const rots = TETROMINOS[piece.type].length;
    const newRot = ((piece.rotation + dir) % rots + rots) % rots;
    const newMatrix = TETROMINOS[piece.type][newRot];

    // Tentar rotação com wall kicks: offsets 0, -1, +1, -2, +2
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collides(piece, newMatrix, kick, 0)) {
        piece.x += kick;
        piece.rotation = newRot;
        piece.matrix = newMatrix;
        return true;
      }
    }
    return false;
  }

  // --- Mover Peça ---
  function movePiece(dx, dy) {
    if (!gameRunning || gamePaused || gameOver) return false;
    if (!collides(currentPiece, currentPiece.matrix, dx, dy)) {
      currentPiece.x += dx;
      currentPiece.y += dy;
      return true;
    }
    return false;
  }

  // --- Fixar Peça no Tabuleiro ---
  function lockPiece() {
    const m = currentPiece.matrix;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const boardY = currentPiece.y + r;
        const boardX = currentPiece.x + c;
        if (boardY < 0) {
          // Game over: peça saiu pelo topo
          triggerGameOver();
          return;
        }
        board[boardY][boardX] = currentPiece.color;
      }
    }
    clearLines();
    spawnNext();
  }

  // --- Limpar Linhas ---
  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell !== null)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // rever a mesma linha após splice
      }
    }
    if (cleared > 0) {
      linesCleared += cleared;
      score += LINE_SCORES[cleared] * level;
      level = Math.floor(linesCleared / 10) + 1;
      updateUI();
    }
  }

  // --- Próxima Peça ---
  function spawnNext() {
    currentPiece = nextPiece;
    nextPiece = randomPiece();

    // Verifica game over imediato
    if (collides(currentPiece, currentPiece.matrix, 0, 0)) {
      triggerGameOver();
      return;
    }
    drawNext();
  }

  // --- Hard Drop ---
  function hardDrop() {
    if (!gameRunning || gamePaused || gameOver) return;
    let dropped = 0;
    while (!collides(currentPiece, currentPiece.matrix, 0, 1)) {
      currentPiece.y++;
      dropped++;
    }
    score += dropped * 2;
    updateUI();
    lockPiece();
  }

  // --- Ghost Piece (sombra) ---
  function getGhostY() {
    let ghostY = currentPiece.y;
    while (!collides(
      { ...currentPiece, y: ghostY },
      currentPiece.matrix,
      0, 1
    )) {
      ghostY++;
    }
    return ghostY;
  }

  // --- Game Over ---
  function triggerGameOver() {
    gameRunning = false;
    gameOver = true;
    cancelAnimationFrame(animFrameId);
    MiniJogos.saveHighScore('tetris', score);
    highScoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('tetris'));
    drawBoard(); // desenha estado final com overlay
  }

  // --- Update UI ---
  function updateUI() {
    scoreEl.textContent = MiniJogos.formatScore(score);
    levelEl.textContent = level;
    if (linesEl) linesEl.textContent = linesCleared;
  }

  // --- Desenho ---
  function drawBlock(context, x, y, size, color, alpha) {
    context.save();
    context.globalAlpha = alpha !== undefined ? alpha : 1;
    // Fundo do bloco
    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    // Brilho superior
    context.fillStyle = 'rgba(255,255,255,0.2)';
    context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    // Brilho lateral esquerdo
    context.fillRect(x * size + 1, y * size + 1, 4, size - 2);
    // Sombra inferior
    context.fillStyle = 'rgba(0,0,0,0.3)';
    context.fillRect(x * size + 1, y * size + size - 5, size - 2, 4);
    context.restore();
  }

  function drawBoard() {
    const bs = getBlockSize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo do tabuleiro com grid
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(58, 58, 106, 0.4)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeRect(c * bs, r * bs, bs, bs);
      }
    }

    // Ghost piece
    if (gameRunning && !gamePaused && currentPiece) {
      const ghostY = getGhostY();
      if (ghostY !== currentPiece.y) {
        const m = currentPiece.matrix;
        for (let r = 0; r < m.length; r++) {
          for (let c = 0; c < m[r].length; c++) {
            if (m[r][c]) {
              drawBlock(ctx, currentPiece.x + c, ghostY + r, bs, currentPiece.color, GHOST_ALPHA);
            }
          }
        }
      }
    }

    // Blocos fixados no tabuleiro
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          drawBlock(ctx, c, r, bs, board[r][c]);
        }
      }
    }

    // Peça atual
    if (gameRunning && !gamePaused && currentPiece) {
      const m = currentPiece.matrix;
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
          if (m[r][c]) {
            drawBlock(ctx, currentPiece.x + c, currentPiece.y + r, bs, currentPiece.color);
          }
        }
      }
    }

    // Overlay de pausa
    if (gamePaused && !gameOver) {
      drawOverlay('PAUSA', 'Pressione P para continuar');
    }

    // Overlay de game over
    if (gameOver) {
      drawOverlay('GAME OVER', `Pontuação: ${MiniJogos.formatScore(score)}`);
    }

    // Overlay de idle (não iniciado)
    if (!gameRunning && !gameOver) {
      drawIdleScreen();
    }
  }

  function drawOverlay(title, subtitle) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 26, 0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${Math.min(32, canvas.width * 0.1)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = '#7c5cff';
    ctx.fillText(title, cx, cy - 20);

    ctx.font = `${Math.min(16, canvas.width * 0.05)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = '#9999bb';
    ctx.fillText(subtitle, cx, cy + 16);

    ctx.restore();
  }

  function drawIdleScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid decorativa
    ctx.strokeStyle = 'rgba(58, 58, 106, 0.3)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeRect(c * getBlockSize(), r * getBlockSize(), getBlockSize(), getBlockSize());
      }
    }

    drawOverlay('TETRIS', 'Clique em Iniciar para jogar');
  }

  function drawNext() {
    const nb = getNextBlockSize();
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.fillStyle = '#0a0a1a';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece) return;

    const m = nextPiece.matrix;
    const cols = m[0].length;
    const rows = m.length;
    const offsetX = Math.floor((4 - cols) / 2);
    const offsetY = Math.floor((4 - rows) / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (m[r][c]) {
          drawBlock(nextCtx, offsetX + c, offsetY + r, nb, nextPiece.color);
        }
      }
    }
  }

  // --- Loop Principal ---
  function gameLoop(timestamp) {
    if (!gameRunning || gamePaused || gameOver) return;

    const delta = timestamp - lastTime;
    lastTime = timestamp;
    dropCounter += delta;

    if (dropCounter >= dropInterval(level)) {
      dropCounter = 0;
      if (!movePiece(0, 1)) {
        lockPiece();
      }
    }

    drawBoard();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  // --- Iniciar Jogo ---
  function startGame() {
    board = createBoard();
    score = 0;
    level = 1;
    linesCleared = 0;
    gameOver = false;
    gamePaused = false;
    dropCounter = 0;
    lastTime = 0;

    nextPiece = randomPiece();
    currentPiece = randomPiece();
    nextPiece = randomPiece(); // garantir next diferente

    updateUI();
    highScoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('tetris'));

    gameRunning = true;
    startBtn.textContent = 'Pausar';

    cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(function (ts) {
      lastTime = ts;
      gameLoop(ts);
    });
  }

  function togglePause() {
    if (!gameRunning && !gameOver) return;
    if (gameOver) return;

    if (gamePaused) {
      gamePaused = false;
      startBtn.textContent = 'Pausar';
      lastTime = performance.now();
      animFrameId = requestAnimationFrame(function (ts) {
        lastTime = ts;
        gameLoop(ts);
      });
    } else {
      gamePaused = true;
      startBtn.textContent = 'Continuar';
      cancelAnimationFrame(animFrameId);
      drawBoard();
    }
  }

  // --- Controles ---
  document.addEventListener('keydown', function (e) {
    if (!gameRunning && !gameOver) {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        startGame();
      }
      return;
    }

    if (gameOver) {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        startGame();
      }
      return;
    }

    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault();
        movePiece(-1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        movePiece(1, 0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!gamePaused) {
          if (!movePiece(0, 1)) {
            lockPiece();
          } else {
            score += 1;
            updateUI();
          }
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!gamePaused) rotatePiece(currentPiece, 1);
        break;
      case 'KeyZ':
        e.preventDefault();
        if (!gamePaused) rotatePiece(currentPiece, -1);
        break;
      case 'Space':
        e.preventDefault();
        hardDrop();
        break;
      case 'KeyP':
      case 'Escape':
        e.preventDefault();
        togglePause();
        break;
    }
  });

  // --- Botões ---
  startBtn.addEventListener('click', function () {
    if (!gameRunning && !gameOver) {
      startGame();
    } else {
      togglePause();
    }
  });

  restartBtn.addEventListener('click', function () {
    cancelAnimationFrame(animFrameId);
    gameRunning = false;
    gameOver = false;
    gamePaused = false;
    startBtn.textContent = 'Iniciar';
    startGame();
  });

  // --- Controles Mobile ---
  function setupMobileControls() {
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const downBtn = document.getElementById('downBtn');
    const rotateBtn = document.getElementById('rotateBtn');
    const dropBtn = document.getElementById('dropBtn');

    function onTouch(fn) {
      return function (e) {
        e.preventDefault();
        fn();
      };
    }

    if (leftBtn) leftBtn.addEventListener('touchstart', onTouch(() => movePiece(-1, 0)), { passive: false });
    if (rightBtn) rightBtn.addEventListener('touchstart', onTouch(() => movePiece(1, 0)), { passive: false });
    if (downBtn) downBtn.addEventListener('touchstart', onTouch(() => {
      if (!movePiece(0, 1)) lockPiece();
      else { score += 1; updateUI(); }
    }), { passive: false });
    if (rotateBtn) rotateBtn.addEventListener('touchstart', onTouch(() => rotatePiece(currentPiece, 1)), { passive: false });
    if (dropBtn) dropBtn.addEventListener('touchstart', onTouch(() => hardDrop()), { passive: false });

    // Também aceitar click (desktop fallback)
    if (leftBtn) leftBtn.addEventListener('click', () => movePiece(-1, 0));
    if (rightBtn) rightBtn.addEventListener('click', () => movePiece(1, 0));
    if (downBtn) downBtn.addEventListener('click', () => {
      if (!movePiece(0, 1)) lockPiece();
      else { score += 1; updateUI(); }
    });
    if (rotateBtn) rotateBtn.addEventListener('click', () => rotatePiece(currentPiece, 1));
    if (dropBtn) dropBtn.addEventListener('click', () => hardDrop());

    // Mostrar controles mobile se for dispositivo touch
    if (mobileControls) {
      mobileControls.style.display = MiniJogos.isMobile() ? 'flex' : 'none';
    }
  }

  // --- Swipe para mobile ---
  function setupSwipe() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    canvas.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    canvas.addEventListener('touchend', function (e) {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const dt = Date.now() - touchStartTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (!gameRunning || gamePaused || gameOver) return;

      // Tap rápido = rotacionar
      if (dt < 200 && absDx < 20 && absDy < 20) {
        rotatePiece(currentPiece, 1);
        return;
      }

      // Swipe
      if (absDx > absDy && absDx > 30) {
        movePiece(dx > 0 ? 1 : -1, 0);
      } else if (absDy > absDx && absDy > 30) {
        if (dy > 0) {
          // Swipe down: hard drop se rápido, soft drop se lento
          if (dt < 300) {
            hardDrop();
          } else {
            if (!movePiece(0, 1)) lockPiece();
          }
        }
      }
    }, { passive: true });
  }

  // --- Resize ---
  window.addEventListener('resize', function () {
    clearTimeout(window._tetrisResizeTimer);
    window._tetrisResizeTimer = setTimeout(resizeGame, 100);
  });

  // --- Init ---
  function init() {
    resizeGame();
    setupMobileControls();
    setupSwipe();
    highScoreEl.textContent = MiniJogos.formatScore(MiniJogos.getHighScore('tetris'));
    updateUI();
    drawIdleScreen();
  }

  document.addEventListener('DOMContentLoaded', init);
  // Caso o script rode após DOMContentLoaded
  if (document.readyState !== 'loading') init();

})();
