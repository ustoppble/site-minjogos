/* ============================================
   JOGO DA MEMÓRIA — Mini Jogos
   game.js — Lógica completa do jogo
   ============================================ */

(function () {
  'use strict';

  // --- Constantes ---
  const COLS = 4;
  const ROWS = 4;
  const TOTAL_CARDS = COLS * ROWS;
  const TOTAL_PAIRS = TOTAL_CARDS / 2;
  const CARD_GAP = 8;
  const CARD_RADIUS = 10;
  const FLIP_DURATION = 250;     // ms para a animação de virar
  const MISMATCH_DELAY = 800;    // ms para mostrar cartas erradas
  const MATCH_FLASH_DURATION = 400; // ms do flash de acerto

  const EMOJIS = ['🐶', '🐱', '🐸', '🦊', '🐻', '🐼', '🐨', '🦁'];

  // Cores do design system
  const COLOR_BG = '#0f0f23';
  const COLOR_CARD_BACK = '#1a1a3e';
  const COLOR_CARD_BACK_HOVER = '#252552';
  const COLOR_CARD_BORDER = '#3a3a6a';
  const COLOR_CARD_FRONT = '#2a2a5a';
  const COLOR_CARD_MATCHED = '#1a3a2e';
  const COLOR_CARD_MATCHED_BORDER = '#00e5a0';
  const COLOR_PRIMARY = '#7c5cff';
  const COLOR_ACCENT = '#00e5a0';
  const COLOR_TEXT = '#e8e8f0';
  const COLOR_TEXT_MUTED = '#9999bb';
  const COLOR_QUESTION = '#7c5cff';
  const COLOR_PATTERN_LINE = '#3a3a6a';

  // --- Estado do jogo ---
  let canvas, ctx;
  let cardWidth, cardHeight;
  let cards = [];
  let flippedCards = [];       // índices das cartas viradas no turno atual
  let matchedPairs = 0;
  let moves = 0;
  let gameState = 'idle';      // idle | running | checking | won
  let locked = false;          // bloqueia cliques durante animação
  let hoverIndex = -1;         // carta sob o cursor
  let animatingCards = [];     // cartas em animação de flip {index, startTime, direction}
  let matchFlashCards = [];    // cartas em flash de acerto {index, startTime}
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

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Controles de clique
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', function () {
      hoverIndex = -1;
    });

    // Controles touch
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Botões
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    overlayBtn.addEventListener('click', function () {
      if (gameState === 'idle' || gameState === 'won') {
        startGame();
      }
    });

    // Teclado — iniciar com Enter/Espaço
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && (gameState === 'idle' || gameState === 'won')) {
        e.preventDefault();
        startGame();
      }
    });

    drawIdleScreen();
    showOverlay('Jogo da Memória', 'Encontre todos os pares!', 'Iniciar');
  }

  // --- Redimensionamento responsivo ---
  function resizeCanvas() {
    var wrapper = canvas.parentElement;
    var available = wrapper.clientWidth - 32; // padding do wrapper
    var size = Math.min(available, 460);

    canvas.width = size;
    canvas.height = size;

    calcCardDimensions();

    if (gameState === 'idle') {
      drawIdleScreen();
    } else if (cards.length > 0) {
      render();
    }
  }

  function calcCardDimensions() {
    var totalGapX = CARD_GAP * (COLS + 1);
    var totalGapY = CARD_GAP * (ROWS + 1);
    cardWidth = (canvas.width - totalGapX) / COLS;
    cardHeight = (canvas.height - totalGapY) / ROWS;
  }

  // --- Posição de cada carta ---
  function getCardRect(index) {
    var col = index % COLS;
    var row = Math.floor(index / COLS);
    var x = CARD_GAP + col * (cardWidth + CARD_GAP);
    var y = CARD_GAP + row * (cardHeight + CARD_GAP);
    return { x: x, y: y, w: cardWidth, h: cardHeight };
  }

  // --- Criar/embaralhar cartas ---
  function createCards() {
    var symbols = [];
    for (var i = 0; i < TOTAL_PAIRS; i++) {
      symbols.push(EMOJIS[i]);
      symbols.push(EMOJIS[i]);
    }
    // Fisher-Yates shuffle
    for (var j = symbols.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var temp = symbols[j];
      symbols[j] = symbols[k];
      symbols[k] = temp;
    }
    cards = symbols.map(function (emoji) {
      return {
        emoji: emoji,
        faceUp: false,
        matched: false
      };
    });
  }

  // --- Iniciar jogo ---
  function startGame() {
    if (gameState === 'running') return;

    createCards();
    moves = 0;
    matchedPairs = 0;
    flippedCards = [];
    animatingCards = [];
    matchFlashCards = [];
    locked = false;
    hoverIndex = -1;

    updateScoreDisplay();
    updatePairsDisplay();
    hideOverlay();

    gameState = 'running';
    startRenderLoop();
  }

  function restartGame() {
    stopRenderLoop();
    gameState = 'idle';
    startGame();
  }

  // --- Render loop ---
  function startRenderLoop() {
    if (animFrameId) return;
    function loop() {
      render();
      animFrameId = requestAnimationFrame(loop);
    }
    animFrameId = requestAnimationFrame(loop);
  }

  function stopRenderLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  // --- Renderização principal ---
  function render() {
    var now = performance.now();

    // Limpar
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < TOTAL_CARDS; i++) {
      drawCard(i, now);
    }
  }

  function drawCard(index, now) {
    var card = cards[index];
    var rect = getCardRect(index);
    var isHovered = (hoverIndex === index && !card.faceUp && !card.matched && !locked);

    // Verificar se esta carta está animando
    var animInfo = null;
    for (var a = 0; a < animatingCards.length; a++) {
      if (animatingCards[a].index === index) {
        animInfo = animatingCards[a];
        break;
      }
    }

    // Verificar flash de acerto
    var flashInfo = null;
    for (var f = 0; f < matchFlashCards.length; f++) {
      if (matchFlashCards[f].index === index) {
        flashInfo = matchFlashCards[f];
        break;
      }
    }

    // Calcular escala X para animação de flip
    var scaleX = 1;
    var showFront = card.faceUp || card.matched;

    if (animInfo) {
      var elapsed = now - animInfo.startTime;
      var progress = Math.min(elapsed / FLIP_DURATION, 1);
      // Easing suave
      var eased = 1 - Math.pow(1 - progress, 3);

      if (animInfo.direction === 'open') {
        // Primeira metade: fecha (1 -> 0), segunda metade: abre (0 -> 1)
        if (eased < 0.5) {
          scaleX = 1 - eased * 2;
          showFront = false;
        } else {
          scaleX = (eased - 0.5) * 2;
          showFront = true;
        }
      } else {
        // Fechar: inverso
        if (eased < 0.5) {
          scaleX = 1 - eased * 2;
          showFront = true;
        } else {
          scaleX = (eased - 0.5) * 2;
          showFront = false;
        }
      }

      // Animação terminou
      if (progress >= 1) {
        animatingCards.splice(animatingCards.indexOf(animInfo), 1);
      }
    }

    // Desenhar a carta com escala
    ctx.save();

    var cx = rect.x + rect.w / 2;
    var cy = rect.y + rect.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(scaleX, 1);
    ctx.translate(-cx, -cy);

    if (scaleX > 0.02) {
      // Flash de acerto — glow verde
      if (flashInfo) {
        var flashElapsed = now - flashInfo.startTime;
        var flashProgress = Math.min(flashElapsed / MATCH_FLASH_DURATION, 1);
        var flashAlpha = 0.4 * (1 - flashProgress);

        if (flashProgress >= 1) {
          matchFlashCards.splice(matchFlashCards.indexOf(flashInfo), 1);
        }

        ctx.shadowColor = COLOR_ACCENT;
        ctx.shadowBlur = 20 * (1 - flashProgress);
      }

      if (showFront) {
        drawCardFront(rect, card, card.matched);
      } else {
        drawCardBack(rect, isHovered);
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  function drawCardBack(rect, hovered) {
    var x = rect.x;
    var y = rect.y;
    var w = rect.w;
    var h = rect.h;

    // Sombra sutil
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    roundRect(ctx, x + 2, y + 2, w, h, CARD_RADIUS);
    ctx.fill();

    // Fundo da carta
    ctx.fillStyle = hovered ? COLOR_CARD_BACK_HOVER : COLOR_CARD_BACK;
    roundRect(ctx, x, y, w, h, CARD_RADIUS);
    ctx.fill();

    // Borda
    ctx.strokeStyle = hovered ? COLOR_PRIMARY : COLOR_CARD_BORDER;
    ctx.lineWidth = hovered ? 2 : 1;
    roundRect(ctx, x, y, w, h, CARD_RADIUS);
    ctx.stroke();

    // Padrão decorativo (linhas diagonais sutis)
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, CARD_RADIUS);
    ctx.clip();

    ctx.strokeStyle = COLOR_PATTERN_LINE;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    var spacing = 12;
    for (var d = -h; d < w + h; d += spacing) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d - h, y + h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // "?" no centro
    var fontSize = Math.min(w, h) * 0.4;
    ctx.fillStyle = COLOR_QUESTION;
    ctx.font = 'bold ' + fontSize + 'px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + w / 2, y + h / 2);
  }

  function drawCardFront(rect, card, matched) {
    var x = rect.x;
    var y = rect.y;
    var w = rect.w;
    var h = rect.h;

    // Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    roundRect(ctx, x + 2, y + 2, w, h, CARD_RADIUS);
    ctx.fill();

    // Fundo
    ctx.fillStyle = matched ? COLOR_CARD_MATCHED : COLOR_CARD_FRONT;
    roundRect(ctx, x, y, w, h, CARD_RADIUS);
    ctx.fill();

    // Borda
    ctx.strokeStyle = matched ? COLOR_CARD_MATCHED_BORDER : COLOR_PRIMARY;
    ctx.lineWidth = matched ? 2 : 1.5;
    roundRect(ctx, x, y, w, h, CARD_RADIUS);
    ctx.stroke();

    // Brilho sutil no topo
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, CARD_RADIUS);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(x, y, w, h * 0.4);
    ctx.restore();

    // Emoji
    var emojiSize = Math.min(w, h) * 0.5;
    ctx.font = emojiSize + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.emoji, x + w / 2, y + h / 2);
  }

  // --- Tela idle ---
  function drawIdleScreen() {
    calcCardDimensions();

    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar grade de cartas viradas para baixo (preview)
    for (var i = 0; i < TOTAL_CARDS; i++) {
      var rect = getCardRect(i);
      drawCardBack(rect, false);
    }
  }

  // --- Determinar carta clicada ---
  function getCardAtPos(px, py) {
    for (var i = 0; i < TOTAL_CARDS; i++) {
      var r = getCardRect(i);
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
        return i;
      }
    }
    return -1;
  }

  function getCanvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  // --- Interação: clique ---
  function handleClick(e) {
    if (gameState !== 'running' || locked) return;

    var pos = getCanvasPos(e);
    var index = getCardAtPos(pos.x, pos.y);
    flipCard(index);
  }

  // --- Interação: hover ---
  function handleMouseMove(e) {
    if (gameState !== 'running') {
      hoverIndex = -1;
      return;
    }
    var pos = getCanvasPos(e);
    hoverIndex = getCardAtPos(pos.x, pos.y);
  }

  // --- Interação: touch ---
  function handleTouchStart(e) {
    e.preventDefault();

    if (gameState === 'idle' || gameState === 'won') {
      // Não iniciar por toque no canvas se overlay está visível
      // (overlay tem seu próprio botão)
      return;
    }

    if (gameState !== 'running' || locked) return;

    var touch = e.touches[0];
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var px = (touch.clientX - rect.left) * scaleX;
    var py = (touch.clientY - rect.top) * scaleY;

    var index = getCardAtPos(px, py);
    flipCard(index);
  }

  // --- Virar carta ---
  function flipCard(index) {
    if (index < 0) return;
    var card = cards[index];

    // Ignorar se já virada ou já encontrada
    if (card.faceUp || card.matched) return;

    // Ignorar se já selecionou esta carta
    if (flippedCards.indexOf(index) >= 0) return;

    // Virar
    card.faceUp = true;
    flippedCards.push(index);

    // Animar o flip
    animatingCards.push({
      index: index,
      startTime: performance.now(),
      direction: 'open'
    });

    // Se temos 2 cartas viradas, verificar par
    if (flippedCards.length === 2) {
      moves++;
      updateScoreDisplay();
      locked = true;

      var i1 = flippedCards[0];
      var i2 = flippedCards[1];

      if (cards[i1].emoji === cards[i2].emoji) {
        // Par encontrado!
        setTimeout(function () {
          cards[i1].matched = true;
          cards[i2].matched = true;
          matchedPairs++;
          updatePairsDisplay();

          // Flash de acerto
          matchFlashCards.push({ index: i1, startTime: performance.now() });
          matchFlashCards.push({ index: i2, startTime: performance.now() });

          flippedCards = [];
          locked = false;

          // Verificar vitória
          if (matchedPairs === TOTAL_PAIRS) {
            gameWon();
          }
        }, FLIP_DURATION + 100);
      } else {
        // Não é par — virar de volta após delay
        setTimeout(function () {
          cards[i1].faceUp = false;
          cards[i2].faceUp = false;

          animatingCards.push({
            index: i1,
            startTime: performance.now(),
            direction: 'close'
          });
          animatingCards.push({
            index: i2,
            startTime: performance.now(),
            direction: 'close'
          });

          flippedCards = [];
          locked = false;
        }, MISMATCH_DELAY);
      }
    }
  }

  // --- Vitória ---
  function gameWon() {
    gameState = 'won';

    // Salvar highscore (menor é melhor)
    // MiniJogos.saveHighScore salva se score > current
    // Para "menor é melhor", usamos um score invertido grande
    var invertedScore = 10000 - moves;
    if (invertedScore < 0) invertedScore = 0;
    var isNewRecord = MiniJogos.saveHighScore('memory', invertedScore);

    // Pegar o recorde real em jogadas
    var bestInverted = MiniJogos.getHighScore('memory');
    var bestMoves = 10000 - bestInverted;

    var msg;
    if (isNewRecord && moves > 0) {
      msg = 'Novo recorde: ' + moves + ' jogadas!';
    } else if (bestInverted > 0) {
      msg = moves + ' jogadas! Recorde: ' + bestMoves;
    } else {
      msg = 'Completou em ' + moves + ' jogadas!';
    }

    // Pequeno delay para ver o último par
    setTimeout(function () {
      showOverlay('Parabéns! 🎉', msg, 'Jogar Novamente');
      stopRenderLoop();
      render(); // último frame
    }, 600);
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
    scoreEl.textContent = moves.toString().padStart(3, '0');
  }

  function updatePairsDisplay() {
    highscoreEl.textContent = matchedPairs + '/' + TOTAL_PAIRS;
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

  // --- Arrancar quando o DOM estiver pronto ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
