/* ============================================
   JOGO DA VELHA — Mini Jogos
   game.js — Lógica completa do jogo
   ============================================ */

(function () {
  'use strict';

  // --- Constantes de cor ---
  const COLOR_BG = '#0f0f23';
  const COLOR_GRID = '#3a3a6a';
  const COLOR_GRID_BG = '#1a1a3e';
  const COLOR_CELL_HOVER = '#252552';
  const COLOR_X = '#00e5a0';
  const COLOR_X_GLOW = 'rgba(0, 229, 160, 0.2)';
  const COLOR_O = '#7c5cff';
  const COLOR_O_GLOW = 'rgba(124, 92, 255, 0.2)';
  const COLOR_WIN_LINE = '#ffb347';
  const COLOR_TEXT = '#e8e8f0';
  const COLOR_TEXT_MUTED = '#9999bb';
  const COLOR_DRAW = '#9999bb';

  // --- Constantes do jogo ---
  const BOARD_SIZE = 3;
  const PLAYER_X = 'X';
  const PLAYER_O = 'O';
  const EMPTY = '';
  const ANIM_DURATION = 300; // ms para animar X/O
  const WIN_LINE_DURATION = 400; // ms para animar linha de vitória
  const AUTO_RESTART_DELAY = 2000; // ms para auto-restart

  // Combinações vencedoras
  const WIN_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // colunas
    [0, 4, 8], [2, 4, 6],            // diagonais
  ];

  // --- Estado do jogo ---
  let canvas, ctx;
  let cellSize, gridPadding, gridOffset;
  let board = [];
  let currentPlayer = PLAYER_X;
  let gameState = 'idle'; // idle | playing | ended
  let playerScore = 0;
  let cpuScore = 0;
  let winCombo = null; // índices da combinação vencedora
  let winner = null; // 'X', 'O', ou 'draw'
  let hoverCell = -1; // célula sob o mouse
  let autoRestartTimeout = null;

  // Animações
  let cellAnimations = []; // { cell, progress: 0..1, startTime }
  let winLineProgress = 0;
  let winLineStartTime = 0;
  let animFrameId = null;

  // --- Elementos DOM ---
  const scoreEl = document.getElementById('score');
  const highscoreEl = document.getElementById('highscore');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const overlay = document.getElementById('gameOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMsg = document.getElementById('overlayMsg');
  const overlayBtn = document.getElementById('overlayBtn');

  // --- Inicialização ---
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    playerScore = MiniJogos.getHighScore('tic-tac-toe');
    updateScoreDisplay();

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    drawIdleScreen();
    showOverlay('Jogo da Velha', 'Você é o X. Vença a CPU!', 'Iniciar');

    // Controles mouse
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Controles touch
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    // Teclado
    document.addEventListener('keydown', handleKeyDown);

    // Botões
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    overlayBtn.addEventListener('click', function () {
      if (gameState === 'idle' || gameState === 'ended') {
        startGame();
      }
    });
  }

  // --- Redimensionamento responsivo ---
  function resizeCanvas() {
    var wrapper = canvas.parentElement;
    var available = wrapper.clientWidth - 32;
    var size = Math.min(available, 420);

    canvas.width = size;
    canvas.height = size;

    gridPadding = Math.floor(size * 0.08);
    var gridArea = size - gridPadding * 2;
    cellSize = Math.floor(gridArea / BOARD_SIZE);
    gridOffset = gridPadding + Math.floor((gridArea - cellSize * BOARD_SIZE) / 2);

    render();
  }

  // --- Iniciar jogo ---
  function startGame() {
    if (autoRestartTimeout) {
      clearTimeout(autoRestartTimeout);
      autoRestartTimeout = null;
    }

    board = Array(9).fill(EMPTY);
    currentPlayer = PLAYER_X;
    winCombo = null;
    winner = null;
    hoverCell = -1;
    cellAnimations = [];
    winLineProgress = 0;
    gameState = 'playing';

    hideOverlay();
    render();
  }

  function restartGame() {
    if (autoRestartTimeout) {
      clearTimeout(autoRestartTimeout);
      autoRestartTimeout = null;
    }
    startGame();
  }

  // --- Coordenadas ---
  function getCellFromPos(x, y) {
    var col = Math.floor((x - gridOffset) / cellSize);
    var row = Math.floor((y - gridOffset) / cellSize);
    if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) return -1;
    return row * BOARD_SIZE + col;
  }

  function getCellCenter(index) {
    var col = index % BOARD_SIZE;
    var row = Math.floor(index / BOARD_SIZE);
    return {
      x: gridOffset + col * cellSize + cellSize / 2,
      y: gridOffset + row * cellSize + cellSize / 2,
    };
  }

  // --- Jogada do jogador ---
  function makeMove(cell) {
    if (gameState !== 'playing') return;
    if (board[cell] !== EMPTY) return;
    if (currentPlayer !== PLAYER_X) return;

    board[cell] = PLAYER_X;
    startCellAnimation(cell);

    var result = checkWin();
    if (result) {
      endGame(result);
      return;
    }

    currentPlayer = PLAYER_O;
    // CPU joga após um breve delay para parecer natural
    setTimeout(cpuMove, 400);
  }

  // --- IA da CPU (Minimax) ---
  function cpuMove() {
    if (gameState !== 'playing') return;
    if (currentPlayer !== PLAYER_O) return;

    var bestMove = findBestMove();
    if (bestMove === -1) return;

    board[bestMove] = PLAYER_O;
    startCellAnimation(bestMove);

    var result = checkWin();
    if (result) {
      endGame(result);
      return;
    }

    currentPlayer = PLAYER_X;
    render();
  }

  function findBestMove() {
    // Minimax completo
    var bestScore = -Infinity;
    var bestCell = -1;

    for (var i = 0; i < 9; i++) {
      if (board[i] !== EMPTY) continue;
      board[i] = PLAYER_O;
      var moveScore = minimax(board, 0, false);
      board[i] = EMPTY;
      if (moveScore > bestScore) {
        bestScore = moveScore;
        bestCell = i;
      }
    }

    return bestCell;
  }

  function minimax(b, depth, isMaximizing) {
    var result = evaluateBoard(b);
    if (result !== null) return result;

    if (isMaximizing) {
      var best = -Infinity;
      for (var i = 0; i < 9; i++) {
        if (b[i] !== EMPTY) continue;
        b[i] = PLAYER_O;
        best = Math.max(best, minimax(b, depth + 1, false));
        b[i] = EMPTY;
      }
      return best;
    } else {
      var best = Infinity;
      for (var i = 0; i < 9; i++) {
        if (b[i] !== EMPTY) continue;
        b[i] = PLAYER_X;
        best = Math.min(best, minimax(b, depth + 1, true));
        b[i] = EMPTY;
      }
      return best;
    }
  }

  function evaluateBoard(b) {
    for (var c = 0; c < WIN_COMBOS.length; c++) {
      var combo = WIN_COMBOS[c];
      if (b[combo[0]] !== EMPTY && b[combo[0]] === b[combo[1]] && b[combo[1]] === b[combo[2]]) {
        return b[combo[0]] === PLAYER_O ? 10 : -10;
      }
    }
    // Empate
    if (b.every(function (cell) { return cell !== EMPTY; })) return 0;
    // Jogo em andamento
    return null;
  }

  // --- Verificar vitória ---
  function checkWin() {
    for (var c = 0; c < WIN_COMBOS.length; c++) {
      var combo = WIN_COMBOS[c];
      if (board[combo[0]] !== EMPTY &&
          board[combo[0]] === board[combo[1]] &&
          board[combo[1]] === board[combo[2]]) {
        return { winner: board[combo[0]], combo: combo };
      }
    }
    if (board.every(function (cell) { return cell !== EMPTY; })) {
      return { winner: 'draw', combo: null };
    }
    return null;
  }

  // --- Fim do jogo ---
  function endGame(result) {
    gameState = 'ended';
    winner = result.winner;
    winCombo = result.combo;

    if (winner === PLAYER_X) {
      playerScore++;
      MiniJogos.saveHighScore('tic-tac-toe', playerScore);
    } else if (winner === PLAYER_O) {
      cpuScore++;
    }

    updateScoreDisplay();

    // Animar linha de vitória
    if (winCombo) {
      winLineStartTime = performance.now();
      winLineProgress = 0;
      requestAnimFrame();
    } else {
      render();
    }

    // Mostrar overlay após a animação
    var overlayDelay = winCombo ? WIN_LINE_DURATION + 300 : 500;
    setTimeout(function () {
      var emoji, title, msg;
      if (winner === PLAYER_X) {
        emoji = '🎉';
        title = 'Você Venceu!';
        msg = 'Parabéns! Placar: ' + playerScore + ' x ' + cpuScore;
      } else if (winner === PLAYER_O) {
        emoji = '😞';
        title = 'CPU Venceu';
        msg = 'Tente novamente! Placar: ' + playerScore + ' x ' + cpuScore;
      } else {
        emoji = '🤝';
        title = 'Empate!';
        msg = 'Ninguém venceu. Placar: ' + playerScore + ' x ' + cpuScore;
      }

      document.querySelector('.overlay-emoji').textContent = emoji;
      showOverlay(title, msg, 'Jogar Novamente');

      // Auto-restart
      autoRestartTimeout = setTimeout(function () {
        if (gameState === 'ended') {
          startGame();
        }
      }, AUTO_RESTART_DELAY);
    }, overlayDelay);
  }

  // --- Animações ---
  function startCellAnimation(cell) {
    cellAnimations.push({
      cell: cell,
      startTime: performance.now(),
      progress: 0,
    });
    requestAnimFrame();
  }

  function requestAnimFrame() {
    if (animFrameId) return;
    animFrameId = requestAnimationFrame(animLoop);
  }

  function animLoop(timestamp) {
    animFrameId = null;
    var needsMore = false;

    // Atualizar animações de células
    for (var i = 0; i < cellAnimations.length; i++) {
      var anim = cellAnimations[i];
      var elapsed = timestamp - anim.startTime;
      anim.progress = Math.min(1, elapsed / ANIM_DURATION);
      if (anim.progress < 1) needsMore = true;
    }

    // Atualizar animação da linha de vitória
    if (winCombo && winLineProgress < 1) {
      var elapsed = timestamp - winLineStartTime;
      winLineProgress = Math.min(1, elapsed / WIN_LINE_DURATION);
      if (winLineProgress < 1) needsMore = true;
    }

    render();

    if (needsMore) {
      animFrameId = requestAnimationFrame(animLoop);
    }
  }

  // --- Easing ---
  function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  // --- Renderização ---
  function render() {
    if (gameState === 'idle') {
      drawIdleScreen();
      return;
    }
    drawBackground();
    drawGrid();
    drawPieces();
    drawHover();
    if (winCombo && winLineProgress > 0) {
      drawWinLine();
    }
    if (gameState === 'ended' && !winCombo) {
      drawDrawEffect();
    }
  }

  function drawIdleScreen() {
    drawBackground();
    drawGrid();
    // Desenha peças demo (X vence na diagonal)
    var demoBoard = [
      PLAYER_X, EMPTY, PLAYER_O,
      EMPTY, PLAYER_X, EMPTY,
      PLAYER_O, EMPTY, PLAYER_X,
    ];
    for (var i = 0; i < 9; i++) {
      if (demoBoard[i] === PLAYER_X) {
        drawX(i, 1);
      } else if (demoBoard[i] === PLAYER_O) {
        drawO(i, 1);
      }
    }
  }

  function drawBackground() {
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawGrid() {
    var lineWidth = Math.max(3, Math.floor(cellSize * 0.04));

    // Fundo das células
    for (var row = 0; row < BOARD_SIZE; row++) {
      for (var col = 0; col < BOARD_SIZE; col++) {
        var x = gridOffset + col * cellSize;
        var y = gridOffset + row * cellSize;
        var padding = lineWidth / 2 + 1;

        ctx.fillStyle = COLOR_GRID_BG;
        roundRect(ctx, x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, 6);
        ctx.fill();
      }
    }

    // Linhas do grid
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Linhas verticais
    for (var i = 1; i < BOARD_SIZE; i++) {
      var x = gridOffset + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, gridOffset + lineWidth);
      ctx.lineTo(x, gridOffset + cellSize * BOARD_SIZE - lineWidth);
      ctx.stroke();
    }

    // Linhas horizontais
    for (var i = 1; i < BOARD_SIZE; i++) {
      var y = gridOffset + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(gridOffset + lineWidth, y);
      ctx.lineTo(gridOffset + cellSize * BOARD_SIZE - lineWidth, y);
      ctx.stroke();
    }
  }

  function drawPieces() {
    for (var i = 0; i < 9; i++) {
      if (board[i] === EMPTY) continue;

      // Verificar se há animação ativa para esta célula
      var progress = 1;
      for (var a = 0; a < cellAnimations.length; a++) {
        if (cellAnimations[a].cell === i) {
          progress = cellAnimations[a].progress;
          break;
        }
      }

      if (board[i] === PLAYER_X) {
        drawX(i, progress);
      } else {
        drawO(i, progress);
      }
    }
  }

  function drawX(cell, progress) {
    var center = getCellCenter(cell);
    var size = cellSize * 0.3;
    var scale = easeOutBack(Math.min(1, progress));
    var s = size * scale;

    // Glow
    ctx.save();
    ctx.shadowColor = COLOR_X;
    ctx.shadowBlur = 12 * progress;
    ctx.strokeStyle = COLOR_X;
    ctx.lineWidth = Math.max(3, Math.floor(cellSize * 0.05));
    ctx.lineCap = 'round';
    ctx.globalAlpha = progress;

    ctx.beginPath();
    ctx.moveTo(center.x - s, center.y - s);
    ctx.lineTo(center.x + s, center.y + s);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(center.x + s, center.y - s);
    ctx.lineTo(center.x - s, center.y + s);
    ctx.stroke();

    ctx.restore();
  }

  function drawO(cell, progress) {
    var center = getCellCenter(cell);
    var radius = cellSize * 0.28;
    var scale = easeOutBack(Math.min(1, progress));
    var r = radius * scale;

    // Glow
    ctx.save();
    ctx.shadowColor = COLOR_O;
    ctx.shadowBlur = 12 * progress;
    ctx.strokeStyle = COLOR_O;
    ctx.lineWidth = Math.max(3, Math.floor(cellSize * 0.05));
    ctx.globalAlpha = progress;

    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function drawHover() {
    if (gameState !== 'playing') return;
    if (currentPlayer !== PLAYER_X) return;
    if (hoverCell < 0 || board[hoverCell] !== EMPTY) return;

    var col = hoverCell % BOARD_SIZE;
    var row = Math.floor(hoverCell / BOARD_SIZE);
    var x = gridOffset + col * cellSize;
    var y = gridOffset + row * cellSize;
    var lineWidth = Math.max(3, Math.floor(cellSize * 0.04));
    var padding = lineWidth / 2 + 1;

    ctx.fillStyle = COLOR_CELL_HOVER;
    roundRect(ctx, x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, 6);
    ctx.fill();

    // X fantasma
    var center = getCellCenter(hoverCell);
    var size = cellSize * 0.3;

    ctx.save();
    ctx.strokeStyle = COLOR_X;
    ctx.lineWidth = Math.max(3, Math.floor(cellSize * 0.05));
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.25;

    ctx.beginPath();
    ctx.moveTo(center.x - size, center.y - size);
    ctx.lineTo(center.x + size, center.y + size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(center.x + size, center.y - size);
    ctx.lineTo(center.x - size, center.y + size);
    ctx.stroke();

    ctx.restore();
  }

  function drawWinLine() {
    if (!winCombo) return;

    var start = getCellCenter(winCombo[0]);
    var end = getCellCenter(winCombo[2]);

    var progress = easeOutQuad(winLineProgress);
    var currentX = start.x + (end.x - start.x) * progress;
    var currentY = start.y + (end.y - start.y) * progress;

    ctx.save();
    ctx.strokeStyle = COLOR_WIN_LINE;
    ctx.lineWidth = Math.max(5, Math.floor(cellSize * 0.08));
    ctx.lineCap = 'round';
    ctx.shadowColor = COLOR_WIN_LINE;
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    ctx.restore();
  }

  function drawDrawEffect() {
    ctx.fillStyle = 'rgba(15, 15, 35, 0.35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // --- Utilitário: roundRect ---
  function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // --- Overlay ---
  function showOverlay(title, msg, btnText) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    overlayBtn.textContent = btnText;
    overlay.classList.add('visible');
  }

  function hideOverlay() {
    overlay.classList.remove('visible');
  }

  // --- Atualizar displays ---
  function updateScoreDisplay() {
    scoreEl.textContent = playerScore;
    highscoreEl.textContent = cpuScore;
  }

  // --- Controles ---
  function getCanvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handleClick(e) {
    if (gameState === 'idle') {
      startGame();
      return;
    }
    if (gameState === 'ended') {
      if (autoRestartTimeout) {
        clearTimeout(autoRestartTimeout);
        autoRestartTimeout = null;
      }
      startGame();
      return;
    }
    if (gameState !== 'playing') return;

    var pos = getCanvasPos(e);
    var cell = getCellFromPos(pos.x, pos.y);
    if (cell >= 0) {
      makeMove(cell);
    }
  }

  function handleMouseMove(e) {
    if (gameState !== 'playing') {
      if (hoverCell !== -1) {
        hoverCell = -1;
        render();
      }
      return;
    }

    var pos = getCanvasPos(e);
    var cell = getCellFromPos(pos.x, pos.y);
    if (cell !== hoverCell) {
      hoverCell = cell;
      render();
    }
  }

  function handleMouseLeave() {
    if (hoverCell !== -1) {
      hoverCell = -1;
      render();
    }
  }

  function handleTouch(e) {
    e.preventDefault();

    if (gameState === 'idle') {
      startGame();
      return;
    }
    if (gameState === 'ended') {
      if (autoRestartTimeout) {
        clearTimeout(autoRestartTimeout);
        autoRestartTimeout = null;
      }
      startGame();
      return;
    }
    if (gameState !== 'playing') return;

    var touch = e.touches[0];
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = (touch.clientX - rect.left) * scaleX;
    var y = (touch.clientY - rect.top) * scaleY;

    var cell = getCellFromPos(x, y);
    if (cell >= 0) {
      makeMove(cell);
    }
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ' ') && (gameState === 'idle' || gameState === 'ended')) {
      e.preventDefault();
      if (autoRestartTimeout) {
        clearTimeout(autoRestartTimeout);
        autoRestartTimeout = null;
      }
      startGame();
    }
  }

  // --- Arrancar quando o DOM estiver pronto ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
