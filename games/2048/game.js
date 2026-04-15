/* ============================================
   2048 — Mini Jogos
   game.js — Logica completa do jogo
   ============================================ */

(function () {
  'use strict';

  // --- Constantes ---
  const GRID_SIZE = 4;
  const ANIM_DURATION = 120; // ms para animacao de slide

  // Cores do design system
  const COLOR_BG = '#0f0f23';
  const COLOR_GRID_BG = '#1a1a3e';
  const COLOR_CELL_EMPTY = '#2a2a5a';
  const COLOR_BORDER = '#3a3a6a';
  const COLOR_TEXT = '#e8e8f0';
  const COLOR_TEXT_DARK = '#0f0f23';
  const COLOR_TEXT_MUTED = '#9999bb';

  // Cores por valor de tile
  const TILE_COLORS = {
    2:    { bg: '#3a3a6a', text: COLOR_TEXT },
    4:    { bg: '#4a4a7a', text: COLOR_TEXT },
    8:    { bg: '#7c5cff', text: '#ffffff' },
    16:   { bg: '#9b7fff', text: '#ffffff' },
    32:   { bg: '#00e5a0', text: COLOR_TEXT_DARK },
    64:   { bg: '#00b87a', text: COLOR_TEXT_DARK },
    128:  { bg: '#ffb347', text: COLOR_TEXT_DARK },
    256:  { bg: '#ff9500', text: COLOR_TEXT_DARK },
    512:  { bg: '#ff5757', text: '#ffffff' },
    1024: { bg: '#e03e3e', text: '#ffffff' },
    2048: { bg: '#ffd700', text: COLOR_TEXT_DARK },
  };

  const DEFAULT_TILE_COLOR = { bg: '#7c5cff', text: '#ffffff' };

  // --- Estado do jogo ---
  let canvas, ctx;
  let boardSize, cellSize, cellGap, cellInner, boardPadding;
  let grid = [];
  let score = 0;
  let highScore = 0;
  let gameState = 'idle'; // idle | running | animating | gameover | won
  let touchStartX = 0;
  let touchStartY = 0;
  let animatingTiles = [];
  let animStartTime = 0;
  let newTiles = [];
  let mergedTiles = [];
  let animFrame = null;
  let won2048 = false; // se ja ganhou e escolheu continuar

  // --- Elementos DOM ---
  const scoreEl = document.getElementById('score');
  const highscoreEl = document.getElementById('highscore');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const overlay = document.getElementById('gameOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMsg = document.getElementById('overlayMsg');
  const overlayBtn = document.getElementById('overlayBtn');

  // --- Inicializacao ---
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    highScore = MiniJogos.getHighScore('2048');
    updateHighscoreDisplay();

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    drawIdleScreen();
    showOverlay('2048', 'Deslize e combine os numeros!', 'Iniciar');

    // Controles teclado
    document.addEventListener('keydown', handleKeyDown);

    // Controles touch
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

    // Botoes
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    overlayBtn.addEventListener('click', function () {
      if (gameState === 'idle' || gameState === 'gameover') {
        startGame();
      } else if (gameState === 'won') {
        // Continuar jogando apos 2048
        won2048 = true;
        gameState = 'running';
        hideOverlay();
      }
    });
  }

  // --- Redimensionamento responsivo ---
  function resizeCanvas() {
    var wrapper = canvas.parentElement;
    var available = wrapper.clientWidth - 32;
    var size = Math.min(available, 440);

    boardSize = size;
    boardPadding = Math.max(6, Math.floor(size * 0.025));
    cellGap = Math.max(6, Math.floor(size * 0.022));
    cellInner = Math.floor((boardSize - boardPadding * 2 - cellGap * (GRID_SIZE + 1)) / GRID_SIZE);
    // Recalcular boardSize para ser exato
    boardSize = cellInner * GRID_SIZE + cellGap * (GRID_SIZE + 1) + boardPadding * 2;
    cellSize = cellInner;

    canvas.width = boardSize;
    canvas.height = boardSize;

    redrawGame();
  }

  // --- Grid ---
  function createEmptyGrid() {
    var g = [];
    for (var r = 0; r < GRID_SIZE; r++) {
      g[r] = [];
      for (var c = 0; c < GRID_SIZE; c++) {
        g[r][c] = 0;
      }
    }
    return g;
  }

  function getEmptyCells() {
    var empty = [];
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === 0) {
          empty.push({ r: r, c: c });
        }
      }
    }
    return empty;
  }

  function addRandomTile() {
    var empty = getEmptyCells();
    if (empty.length === 0) return null;
    var cell = empty[Math.floor(Math.random() * empty.length)];
    var value = Math.random() < 0.9 ? 2 : 4;
    grid[cell.r][cell.c] = value;
    return { r: cell.r, c: cell.c, value: value };
  }

  // --- Iniciar jogo ---
  function startGame() {
    if (gameState === 'running' || gameState === 'animating') return;

    score = 0;
    won2048 = false;
    grid = createEmptyGrid();
    animatingTiles = [];
    newTiles = [];
    mergedTiles = [];

    addRandomTile();
    addRandomTile();

    updateScoreDisplay();
    hideOverlay();

    gameState = 'running';
    redrawGame();
  }

  function restartGame() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
    gameState = 'idle';
    startGame();
  }

  // --- Movimento ---
  function move(dir) {
    if (gameState !== 'running') return;

    var moved = false;
    var moveScore = 0;
    animatingTiles = [];
    mergedTiles = [];
    newTiles = [];

    // Copiar grid anterior para calcular animacoes
    var oldGrid = [];
    for (var r = 0; r < GRID_SIZE; r++) {
      oldGrid[r] = grid[r].slice();
    }

    // Processar movimento dependendo da direcao
    if (dir === 'left') {
      for (var r = 0; r < GRID_SIZE; r++) {
        var result = slideRow(grid[r]);
        if (result.moved) moved = true;
        moveScore += result.score;
        // Registrar animacoes
        for (var c = 0; c < GRID_SIZE; c++) {
          if (result.origins[c] !== null && result.origins[c] !== c) {
            animatingTiles.push({
              fromR: r, fromC: result.origins[c],
              toR: r, toC: c,
              value: result.row[c]
            });
          }
          if (result.merged[c]) {
            mergedTiles.push({ r: r, c: c, value: result.row[c] });
          }
        }
        grid[r] = result.row;
      }
    } else if (dir === 'right') {
      for (var r = 0; r < GRID_SIZE; r++) {
        var reversed = grid[r].slice().reverse();
        var result = slideRow(reversed);
        if (result.moved) moved = true;
        moveScore += result.score;
        result.row.reverse();
        // Origens reversas
        for (var c = 0; c < GRID_SIZE; c++) {
          var origIdx = result.origins[GRID_SIZE - 1 - c];
          if (origIdx !== null) origIdx = GRID_SIZE - 1 - origIdx;
          if (origIdx !== null && origIdx !== c) {
            animatingTiles.push({
              fromR: r, fromC: origIdx,
              toR: r, toC: c,
              value: result.row[c]
            });
          }
          if (result.merged[GRID_SIZE - 1 - c]) {
            mergedTiles.push({ r: r, c: c, value: result.row[c] });
          }
        }
        grid[r] = result.row;
      }
    } else if (dir === 'up') {
      for (var c = 0; c < GRID_SIZE; c++) {
        var col = [];
        for (var r = 0; r < GRID_SIZE; r++) col.push(grid[r][c]);
        var result = slideRow(col);
        if (result.moved) moved = true;
        moveScore += result.score;
        for (var r = 0; r < GRID_SIZE; r++) {
          if (result.origins[r] !== null && result.origins[r] !== r) {
            animatingTiles.push({
              fromR: result.origins[r], fromC: c,
              toR: r, toC: c,
              value: result.row[r]
            });
          }
          if (result.merged[r]) {
            mergedTiles.push({ r: r, c: c, value: result.row[r] });
          }
          grid[r][c] = result.row[r];
        }
      }
    } else if (dir === 'down') {
      for (var c = 0; c < GRID_SIZE; c++) {
        var col = [];
        for (var r = GRID_SIZE - 1; r >= 0; r--) col.push(grid[r][c]);
        var result = slideRow(col);
        if (result.moved) moved = true;
        moveScore += result.score;
        result.row.reverse();
        for (var r = 0; r < GRID_SIZE; r++) {
          var origIdx = result.origins[GRID_SIZE - 1 - r];
          if (origIdx !== null) origIdx = GRID_SIZE - 1 - origIdx;
          if (origIdx !== null && origIdx !== r) {
            animatingTiles.push({
              fromR: origIdx, fromC: c,
              toR: r, toC: c,
              value: result.row[r]
            });
          }
          if (result.merged[GRID_SIZE - 1 - r]) {
            mergedTiles.push({ r: r, c: c, value: result.row[r] });
          }
          grid[r][c] = result.row[r];
        }
      }
    }

    if (!moved) return;

    score += moveScore;
    updateScoreDisplay();

    // Adicionar tile novo
    var added = addRandomTile();
    if (added) {
      newTiles.push(added);
    }

    // Animar
    gameState = 'animating';
    animStartTime = performance.now();
    animateMove();
  }

  // Slide uma fileira para a esquerda, retornando {row, score, moved, origins, merged}
  function slideRow(row) {
    var size = row.length;
    var result = [];
    var origins = [];
    var merged = [];
    var rowScore = 0;
    var moved = false;

    // Filtrar zeros e manter indices originais
    var nonZero = [];
    var nonZeroIdx = [];
    for (var i = 0; i < size; i++) {
      if (row[i] !== 0) {
        nonZero.push(row[i]);
        nonZeroIdx.push(i);
      }
    }

    // Merge
    var pos = 0;
    for (var i = 0; i < nonZero.length; i++) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        // Merge
        var newVal = nonZero[i] * 2;
        result[pos] = newVal;
        origins[pos] = nonZeroIdx[i]; // principal origem
        merged[pos] = true;
        rowScore += newVal;
        i++; // pular proximo
        pos++;
      } else {
        result[pos] = nonZero[i];
        origins[pos] = nonZeroIdx[i];
        merged[pos] = false;
        pos++;
      }
    }

    // Preencher resto com zeros
    while (pos < size) {
      result[pos] = 0;
      origins[pos] = null;
      merged[pos] = false;
      pos++;
    }

    // Verificar se moveu
    for (var i = 0; i < size; i++) {
      if (result[i] !== row[i]) {
        moved = true;
        break;
      }
    }

    return { row: result, score: rowScore, moved: moved, origins: origins, merged: merged };
  }

  // --- Animacao ---
  function animateMove() {
    var now = performance.now();
    var elapsed = now - animStartTime;
    var t = Math.min(1, elapsed / ANIM_DURATION);

    // Easing
    var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    drawBoard();
    drawTilesAnimated(ease);

    if (t < 1) {
      animFrame = requestAnimationFrame(animateMove);
    } else {
      animFrame = null;
      animatingTiles = [];

      // Verificar vitoria
      if (!won2048 && hasValue(2048)) {
        gameState = 'won';
        var isNewRecord = MiniJogos.saveHighScore('2048', score);
        highScore = MiniJogos.getHighScore('2048');
        updateHighscoreDisplay();
        redrawGame();
        showOverlay('Voce venceu! 🎉', 'Pontuacao: ' + MiniJogos.formatScore(score), 'Continuar');
        return;
      }

      // Verificar game over
      if (!canMove()) {
        gameState = 'gameover';
        var isNewRecord = MiniJogos.saveHighScore('2048', score);
        highScore = MiniJogos.getHighScore('2048');
        updateHighscoreDisplay();
        redrawGame();
        var msg = isNewRecord && score > 0
          ? 'Novo recorde: ' + MiniJogos.formatScore(score) + '!'
          : 'Pontuacao: ' + MiniJogos.formatScore(score);
        showOverlay('Game Over 💀', msg, 'Jogar Novamente');
        return;
      }

      gameState = 'running';
      redrawGame();
    }
  }

  function hasValue(val) {
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === val) return true;
      }
    }
    return false;
  }

  function canMove() {
    // Se tem celula vazia, pode mover
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === 0) return true;
      }
    }
    // Se tem vizinhos iguais, pode mover
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var val = grid[r][c];
        if (c + 1 < GRID_SIZE && grid[r][c + 1] === val) return true;
        if (r + 1 < GRID_SIZE && grid[r + 1][c] === val) return true;
      }
    }
    return false;
  }

  // --- Renderizacao ---
  function redrawGame() {
    drawBoard();
    drawTiles();
    if (gameState === 'gameover') {
      drawGameOverEffect();
    }
  }

  function drawIdleScreen() {
    drawBoard();
    // Grade vazia com tiles demo
    var demoGrid = createEmptyGrid();
    demoGrid[1][1] = 2;
    demoGrid[1][2] = 4;
    demoGrid[2][1] = 8;
    demoGrid[2][2] = 16;
    demoGrid[2][3] = 32;
    demoGrid[3][2] = 64;
    demoGrid[3][3] = 128;

    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        if (demoGrid[r][c] > 0) {
          drawTile(r, c, demoGrid[r][c], 1);
        }
      }
    }
  }

  function drawBoard() {
    // Fundo geral
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Fundo do tabuleiro
    roundRect(ctx, boardPadding, boardPadding,
      boardSize - boardPadding * 2, boardSize - boardPadding * 2,
      Math.max(8, cellSize * 0.08));
    ctx.fillStyle = COLOR_GRID_BG;
    ctx.fill();

    // Celulas vazias
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var pos = getCellPos(r, c);
        roundRect(ctx, pos.x, pos.y, cellSize, cellSize, Math.max(4, cellSize * 0.06));
        ctx.fillStyle = COLOR_CELL_EMPTY;
        ctx.fill();
      }
    }
  }

  function drawTiles() {
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] > 0) {
          var isNew = newTiles.some(function (t) { return t.r === r && t.c === c; });
          var isMerged = mergedTiles.some(function (t) { return t.r === r && t.c === c; });
          var scale = 1;
          if (isNew) scale = 1; // aparece normalmente apos animacao
          if (isMerged) scale = 1; // aparece normalmente apos animacao
          drawTile(r, c, grid[r][c], scale);
        }
      }
    }
  }

  function drawTilesAnimated(t) {
    // Primeiro, desenhar tiles que NAO estao animando
    var animatingPositions = {};
    for (var i = 0; i < animatingTiles.length; i++) {
      var a = animatingTiles[i];
      animatingPositions[a.toR + ',' + a.toC] = true;
    }

    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] > 0 && !animatingPositions[r + ',' + c]) {
          // Tiles novos aparecem com pop-in
          var isNew = newTiles.some(function (nt) { return nt.r === r && nt.c === c; });
          if (isNew) {
            var popScale = t * t; // pop in com ease
            drawTile(r, c, grid[r][c], popScale);
          } else {
            drawTile(r, c, grid[r][c], 1);
          }
        }
      }
    }

    // Desenhar tiles animando (deslizando)
    for (var i = 0; i < animatingTiles.length; i++) {
      var a = animatingTiles[i];
      var fromPos = getCellPos(a.fromR, a.fromC);
      var toPos = getCellPos(a.toR, a.toC);

      var curX = fromPos.x + (toPos.x - fromPos.x) * t;
      var curY = fromPos.y + (toPos.y - fromPos.y) * t;

      // Merge pop
      var isMerge = mergedTiles.some(function (m) { return m.r === a.toR && m.c === a.toC; });
      var scale = 1;
      if (isMerge && t > 0.8) {
        var pop = (t - 0.8) / 0.2;
        scale = 1 + 0.12 * Math.sin(pop * Math.PI);
      }

      drawTileAt(curX, curY, a.value, scale);
    }
  }

  function getCellPos(r, c) {
    return {
      x: boardPadding + cellGap + c * (cellSize + cellGap),
      y: boardPadding + cellGap + r * (cellSize + cellGap)
    };
  }

  function drawTile(r, c, value, scale) {
    var pos = getCellPos(r, c);
    drawTileAt(pos.x, pos.y, value, scale);
  }

  function drawTileAt(x, y, value, scale) {
    var colors = TILE_COLORS[value] || DEFAULT_TILE_COLOR;
    var radius = Math.max(4, cellSize * 0.06);

    ctx.save();

    if (scale !== 1) {
      var cx = x + cellSize / 2;
      var cy = y + cellSize / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    }

    // Sombra sutil
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Fundo do tile
    roundRect(ctx, x, y, cellSize, cellSize, radius);
    ctx.fillStyle = colors.bg;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Brilho no topo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, x + 2, y + 2, cellSize - 4, cellSize * 0.4, radius);
    ctx.fill();

    // Texto do numero
    var fontSize = getFontSize(value);
    ctx.font = '700 ' + fontSize + 'px "JetBrains Mono", "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;
    ctx.fillText(String(value), x + cellSize / 2, y + cellSize / 2 + 1);

    ctx.restore();
  }

  function getFontSize(value) {
    var base = cellSize * 0.4;
    if (value < 100) return Math.floor(base);
    if (value < 1000) return Math.floor(base * 0.85);
    if (value < 10000) return Math.floor(base * 0.7);
    return Math.floor(base * 0.6);
  }

  function drawGameOverEffect() {
    ctx.fillStyle = 'rgba(15, 15, 35, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // --- Utilitario: roundRect ---
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
    scoreEl.textContent = MiniJogos.formatScore(score);
  }

  function updateHighscoreDisplay() {
    highscoreEl.textContent = MiniJogos.formatScore(highScore);
  }

  // --- Controles de teclado ---
  function handleKeyDown(e) {
    var key = e.key;

    // Iniciar com Enter/Espaco se idle/gameover
    if ((key === 'Enter' || key === ' ') && (gameState === 'idle' || gameState === 'gameover')) {
      e.preventDefault();
      startGame();
      return;
    }

    if (key === 'Enter' && gameState === 'won') {
      e.preventDefault();
      won2048 = true;
      gameState = 'running';
      hideOverlay();
      return;
    }

    if (gameState !== 'running') return;

    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        move('up');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        move('down');
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        move('left');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        move('right');
        break;
    }
  }

  // --- Controles touch (swipe) ---
  function handleTouchStart(e) {
    var touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function handleTouchEnd(e) {
    if (gameState === 'idle' || gameState === 'gameover') {
      startGame();
      return;
    }

    if (gameState === 'won') {
      won2048 = true;
      gameState = 'running';
      hideOverlay();
      return;
    }

    if (gameState !== 'running') return;

    var touch = e.changedTouches[0];
    var dx = touch.clientX - touchStartX;
    var dy = touch.clientY - touchStartY;
    var minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        move('right');
      } else {
        move('left');
      }
    } else {
      if (dy > 0) {
        move('down');
      } else {
        move('up');
      }
    }
  }

  // --- Arrancar quando o DOM estiver pronto ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
