/* ============================================
   CAMPO MINADO — Mini Jogos
   game.js — Lógica completa do jogo
   ============================================ */

(function () {
  'use strict';

  // --- Constantes ---
  const GRID_COLS = 9;
  const GRID_ROWS = 9;
  const MINE_COUNT = 10;

  // Cores do design system
  const COLOR_BG = '#0f0f23';
  const COLOR_CELL_HIDDEN = '#2a2a5a';
  const COLOR_CELL_HIDDEN_ALT = '#252252';
  const COLOR_CELL_HIDDEN_HOVER = '#3a3a7a';
  const COLOR_CELL_REVEALED = '#1a1a3e';
  const COLOR_CELL_REVEALED_ALT = '#171735';
  const COLOR_BORDER = '#3a3a6a';
  const COLOR_BORDER_LIGHT = '#4a4a7a';
  const COLOR_TEXT = '#e8e8f0';
  const COLOR_TEXT_MUTED = '#9999bb';
  const COLOR_PRIMARY = '#7c5cff';
  const COLOR_ACCENT = '#00e5a0';
  const COLOR_DANGER = '#ff5757';
  const COLOR_WARNING = '#ffb347';
  const COLOR_MINE_BG = '#ff5757';
  const COLOR_FLAG = '#ff5757';
  const COLOR_FLAG_POLE = '#e8e8f0';

  // Cores dos números (1-8)
  const NUMBER_COLORS = [
    null,           // 0 — sem número
    '#5599ff',      // 1 — azul
    '#00e5a0',      // 2 — verde
    '#ff5757',      // 3 — vermelho
    '#9b7fff',      // 4 — roxo
    '#ffb347',      // 5 — laranja
    '#00bcd4',      // 6 — ciano
    '#e8e8f0',      // 7 — branco
    '#9999bb',      // 8 — cinza
  ];

  // --- Estado ---
  const CELL_HIDDEN = 0;
  const CELL_REVEALED = 1;
  const CELL_FLAGGED = 2;

  let canvas, ctx;
  let cellSize;
  let grid = [];         // { mine, adjacentMines, state }
  let gameState = 'idle'; // idle | running | won | lost
  let firstClick = true;
  let flagCount = 0;
  let revealedCount = 0;
  let timer = 0;
  let timerInterval = null;
  let hoverCell = { col: -1, row: -1 };

  // Touch state
  let touchTimeout = null;
  let touchStartTime = 0;
  let touchStartPos = { x: 0, y: 0 };
  let isTouchLong = false;

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

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Controles mouse
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleRightClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Controles touch
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Botões
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    overlayBtn.addEventListener('click', function () {
      if (gameState === 'idle' || gameState === 'won' || gameState === 'lost') {
        startGame();
      }
    });

    // Tecla Enter/Espaço para iniciar
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && (gameState === 'idle' || gameState === 'won' || gameState === 'lost')) {
        e.preventDefault();
        startGame();
      }
    });

    // Desenhar tela inicial
    initGrid();
    drawGame();
    showOverlay('Campo Minado', 'Clique para revelar, evite as minas!', 'Iniciar');
    updateDisplays();
  }

  // --- Redimensionamento ---
  function resizeCanvas() {
    var wrapper = canvas.parentElement;
    var available = wrapper.clientWidth - 32;
    var maxSize = 450;
    var size = Math.min(available, maxSize);
    cellSize = Math.floor(size / GRID_COLS);
    var actualSize = cellSize * GRID_COLS;

    canvas.width = actualSize;
    canvas.height = actualSize;

    drawGame();

    if (gameState === 'idle') {
      showOverlay('Campo Minado', 'Clique para revelar, evite as minas!', 'Iniciar');
    }
  }

  // --- Grid ---
  function initGrid() {
    grid = [];
    for (var r = 0; r < GRID_ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < GRID_COLS; c++) {
        grid[r][c] = {
          mine: false,
          adjacentMines: 0,
          state: CELL_HIDDEN
        };
      }
    }
    firstClick = true;
    flagCount = 0;
    revealedCount = 0;
  }

  function placeMines(excludeRow, excludeCol) {
    // Limpa minas existentes
    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        grid[r][c].mine = false;
        grid[r][c].adjacentMines = 0;
      }
    }

    var placed = 0;
    while (placed < MINE_COUNT) {
      var r = Math.floor(Math.random() * GRID_ROWS);
      var c = Math.floor(Math.random() * GRID_COLS);

      // Não colocar mina na célula clicada nem ao redor
      if (Math.abs(r - excludeRow) <= 1 && Math.abs(c - excludeCol) <= 1) {
        continue;
      }
      if (grid[r][c].mine) continue;

      grid[r][c].mine = true;
      placed++;
    }

    // Calcular números adjacentes
    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        if (grid[r][c].mine) continue;
        var count = 0;
        forEachNeighbor(r, c, function (nr, nc) {
          if (grid[nr][nc].mine) count++;
        });
        grid[r][c].adjacentMines = count;
      }
    }
  }

  function forEachNeighbor(row, col, callback) {
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = row + dr;
        var nc = col + dc;
        if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
          callback(nr, nc);
        }
      }
    }
  }

  // --- Jogo ---
  function startGame() {
    stopTimer();
    initGrid();
    timer = 0;
    gameState = 'running';
    hideOverlay();
    updateDisplays();
    drawGame();
  }

  function revealCell(row, col) {
    var cell = grid[row][col];
    if (cell.state !== CELL_HIDDEN) return;

    // Primeira jogada — posicionar minas
    if (firstClick) {
      placeMines(row, col);
      firstClick = false;
      startTimer();
    }

    // Se é mina, game over
    if (cell.mine) {
      cell.state = CELL_REVEALED;
      gameOver(row, col);
      return;
    }

    // Flood fill
    floodReveal(row, col);

    // Checar vitória
    checkWin();
    drawGame();
  }

  function floodReveal(row, col) {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;
    var cell = grid[row][col];
    if (cell.state !== CELL_HIDDEN) return;
    if (cell.mine) return;

    cell.state = CELL_REVEALED;
    revealedCount++;

    // Se não tem minas adjacentes, propagar
    if (cell.adjacentMines === 0) {
      forEachNeighbor(row, col, function (nr, nc) {
        floodReveal(nr, nc);
      });
    }
  }

  function toggleFlag(row, col) {
    if (gameState !== 'running') return;
    if (firstClick) return; // Não pode marcar antes do primeiro clique

    var cell = grid[row][col];
    if (cell.state === CELL_REVEALED) return;

    if (cell.state === CELL_HIDDEN) {
      cell.state = CELL_FLAGGED;
      flagCount++;
    } else if (cell.state === CELL_FLAGGED) {
      cell.state = CELL_HIDDEN;
      flagCount--;
    }

    updateDisplays();
    drawGame();
  }

  function checkWin() {
    var totalSafe = GRID_ROWS * GRID_COLS - MINE_COUNT;
    if (revealedCount >= totalSafe) {
      gameState = 'won';
      stopTimer();

      // Marcar todas as minas restantes como bandeiras
      for (var r = 0; r < GRID_ROWS; r++) {
        for (var c = 0; c < GRID_COLS; c++) {
          if (grid[r][c].mine && grid[r][c].state !== CELL_FLAGGED) {
            grid[r][c].state = CELL_FLAGGED;
            flagCount++;
          }
        }
      }

      updateDisplays();
      drawGame();

      // Highscore (menor tempo é melhor)
      var bestTime = MiniJogos.getHighScore('minesweeper');
      var isNewRecord = false;
      if (bestTime === 0 || timer < bestTime) {
        // Para minesweeper, menor tempo é melhor — salvar diretamente
        var key = 'minjogos_minesweeper_highscore';
        localStorage.setItem(key, timer.toString());
        isNewRecord = true;
      }

      var msg = isNewRecord
        ? 'Novo recorde: ' + timer + ' segundos!'
        : 'Tempo: ' + timer + 's | Melhor: ' + bestTime + 's';

      showOverlay('Vitória! 🎉', msg, 'Jogar Novamente');
    }
  }

  function gameOver(mineRow, mineCol) {
    gameState = 'lost';
    stopTimer();

    // Revelar todas as minas
    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        if (grid[r][c].mine) {
          grid[r][c].state = CELL_REVEALED;
        }
      }
    }

    drawGame();
    drawExplodedMine(mineRow, mineCol);

    showOverlay('Game Over 💥', 'Você acertou uma mina! Tempo: ' + timer + 's', 'Jogar Novamente');
  }

  // --- Timer ---
  function startTimer() {
    timer = 0;
    timerInterval = setInterval(function () {
      timer++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // --- Displays ---
  function updateDisplays() {
    var remaining = MINE_COUNT - flagCount;
    scoreEl.textContent = remaining.toString().padStart(3, '0');
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    highscoreEl.textContent = timer.toString().padStart(3, '0');
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

  // --- Renderização ---
  function drawGame() {
    // Fundo
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        drawCell(r, c);
      }
    }
  }

  function drawCell(row, col) {
    var cell = grid[row][col];
    var x = col * cellSize;
    var y = row * cellSize;
    var padding = 1;
    var isHovered = (hoverCell.row === row && hoverCell.col === col);
    var isCheckerLight = (row + col) % 2 === 0;

    if (cell.state === CELL_HIDDEN || cell.state === CELL_FLAGGED) {
      // Célula escondida
      var baseColor;
      if (isHovered && cell.state === CELL_HIDDEN && gameState === 'running') {
        baseColor = COLOR_CELL_HIDDEN_HOVER;
      } else {
        baseColor = isCheckerLight ? COLOR_CELL_HIDDEN : COLOR_CELL_HIDDEN_ALT;
      }

      ctx.fillStyle = baseColor;
      ctx.fillRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2);

      // Efeito 3D na célula escondida
      drawCellRaised(x, y, cellSize, padding);

      // Bandeira
      if (cell.state === CELL_FLAGGED) {
        drawFlag(x, y);
      }

    } else {
      // Célula revelada
      var revealColor = isCheckerLight ? COLOR_CELL_REVEALED : COLOR_CELL_REVEALED_ALT;
      ctx.fillStyle = revealColor;
      ctx.fillRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2);

      // Borda sutil interna
      ctx.strokeStyle = COLOR_BORDER;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2);

      if (cell.mine) {
        drawMine(x, y, false);
      } else if (cell.adjacentMines > 0) {
        drawNumber(x, y, cell.adjacentMines);
      }
    }
  }

  function drawCellRaised(x, y, size, padding) {
    // Highlight no topo e esquerda
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + padding, y + size - padding);
    ctx.lineTo(x + padding, y + padding);
    ctx.lineTo(x + size - padding, y + padding);
    ctx.stroke();

    // Sombra embaixo e direita
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + size - padding, y + padding);
    ctx.lineTo(x + size - padding, y + size - padding);
    ctx.lineTo(x + padding, y + size - padding);
    ctx.stroke();
  }

  function drawMine(x, y, exploded) {
    var cx = x + cellSize / 2;
    var cy = y + cellSize / 2;
    var radius = cellSize * 0.28;

    // Fundo da mina (vermelho se explodiu)
    if (exploded) {
      ctx.fillStyle = COLOR_MINE_BG;
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    }

    // Corpo da mina
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Espinhos
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = Math.max(2, cellSize * 0.06);
    var spikeLen = radius * 0.6;
    for (var i = 0; i < 4; i++) {
      var angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * (radius - 1), cy + Math.sin(angle) * (radius - 1));
      ctx.lineTo(cx + Math.cos(angle) * (radius + spikeLen), cy + Math.sin(angle) * (radius + spikeLen));
      ctx.stroke();

      // Lado oposto
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(angle) * (radius - 1), cy - Math.sin(angle) * (radius - 1));
      ctx.lineTo(cx - Math.cos(angle) * (radius + spikeLen), cy - Math.sin(angle) * (radius + spikeLen));
      ctx.stroke();
    }

    // Brilho
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawExplodedMine(row, col) {
    var x = col * cellSize;
    var y = row * cellSize;

    // Fundo vermelho na célula explodida
    ctx.fillStyle = COLOR_MINE_BG;
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

    drawMine(x, y, true);

    // Efeito de escurecimento geral
    ctx.fillStyle = 'rgba(15, 15, 35, 0.35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redesenhar a mina explodida por cima do escurecimento
    ctx.fillStyle = COLOR_MINE_BG;
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    drawMine(x, y, true);
  }

  function drawFlag(x, y) {
    var cx = x + cellSize / 2;
    var cy = y + cellSize / 2;
    var flagW = cellSize * 0.28;
    var flagH = cellSize * 0.22;
    var poleH = cellSize * 0.45;
    var poleX = cx - cellSize * 0.04;

    // Mastro
    ctx.strokeStyle = COLOR_FLAG_POLE;
    ctx.lineWidth = Math.max(1.5, cellSize * 0.05);
    ctx.beginPath();
    ctx.moveTo(poleX, cy - poleH / 2);
    ctx.lineTo(poleX, cy + poleH / 2);
    ctx.stroke();

    // Bandeira (triângulo)
    ctx.fillStyle = COLOR_FLAG;
    ctx.beginPath();
    ctx.moveTo(poleX, cy - poleH / 2);
    ctx.lineTo(poleX + flagW, cy - poleH / 2 + flagH / 2);
    ctx.lineTo(poleX, cy - poleH / 2 + flagH);
    ctx.closePath();
    ctx.fill();

    // Base
    ctx.fillStyle = COLOR_TEXT_MUTED;
    var baseW = cellSize * 0.3;
    var baseH = cellSize * 0.06;
    ctx.fillRect(cx - baseW / 2, cy + poleH / 2 - baseH, baseW, baseH);
  }

  function drawNumber(x, y, num) {
    var cx = x + cellSize / 2;
    var cy = y + cellSize / 2;
    var fontSize = Math.max(12, cellSize * 0.5);

    ctx.fillStyle = NUMBER_COLORS[num] || COLOR_TEXT;
    ctx.font = 'bold ' + fontSize + 'px "JetBrains Mono", "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num.toString(), cx, cy + 1);
  }

  // --- Coordenadas ---
  function getCellFromPixel(px, py) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var cx = (px - rect.left) * scaleX;
    var cy = (py - rect.top) * scaleY;
    var col = Math.floor(cx / cellSize);
    var row = Math.floor(cy / cellSize);

    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return null;
    }
    return { row: row, col: col };
  }

  // --- Controles Mouse ---
  function handleClick(e) {
    if (gameState !== 'running') return;
    var pos = getCellFromPixel(e.clientX, e.clientY);
    if (!pos) return;
    revealCell(pos.row, pos.col);
  }

  function handleRightClick(e) {
    e.preventDefault();
    if (gameState !== 'running') return;
    var pos = getCellFromPixel(e.clientX, e.clientY);
    if (!pos) return;
    toggleFlag(pos.row, pos.col);
  }

  function handleMouseMove(e) {
    var pos = getCellFromPixel(e.clientX, e.clientY);
    if (!pos) {
      if (hoverCell.row !== -1) {
        hoverCell = { row: -1, col: -1 };
        drawGame();
      }
      return;
    }
    if (pos.row !== hoverCell.row || pos.col !== hoverCell.col) {
      hoverCell = pos;
      drawGame();
    }
  }

  function handleMouseLeave() {
    hoverCell = { row: -1, col: -1 };
    drawGame();
  }

  // --- Controles Touch ---
  function handleTouchStart(e) {
    e.preventDefault();

    if (gameState !== 'running') {
      // Toque para iniciar
      if (gameState === 'idle' || gameState === 'won' || gameState === 'lost') {
        // Não iniciar aqui, deixar para o overlay ou botões
      }
      return;
    }

    var touch = e.touches[0];
    touchStartTime = Date.now();
    touchStartPos = { x: touch.clientX, y: touch.clientY };
    isTouchLong = false;

    // Timer para toque longo (500ms) — marcar bandeira
    touchTimeout = setTimeout(function () {
      isTouchLong = true;
      var pos = getCellFromPixel(touchStartPos.x, touchStartPos.y);
      if (pos) {
        toggleFlag(pos.row, pos.col);
        // Feedback visual: vibrar se disponível
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, 500);

    // Hover feedback
    var pos = getCellFromPixel(touch.clientX, touch.clientY);
    if (pos) {
      hoverCell = pos;
      drawGame();
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    // Se o dedo se moveu muito, cancelar o toque longo
    if (touchTimeout) {
      var touch = e.touches[0];
      var dx = touch.clientX - touchStartPos.x;
      var dy = touch.clientY - touchStartPos.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        clearTimeout(touchTimeout);
        touchTimeout = null;
      }
    }
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    hoverCell = { row: -1, col: -1 };

    if (touchTimeout) {
      clearTimeout(touchTimeout);
      touchTimeout = null;
    }

    if (gameState !== 'running') {
      drawGame();
      return;
    }

    // Se foi toque longo, já processou como bandeira
    if (isTouchLong) {
      isTouchLong = false;
      drawGame();
      return;
    }

    // Toque curto — revelar célula
    var pos = getCellFromPixel(touchStartPos.x, touchStartPos.y);
    if (pos) {
      revealCell(pos.row, pos.col);
    }
    drawGame();
  }

  // --- Arrancar ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
