/* ============================================
   MAIN.JS — Mini Jogos
   Utilitarios compartilhados
   ============================================ */

// --- Catalogo de Jogos ---
const GAMES_CATALOG = [
  { id: 'snake', name: 'Snake', emoji: '🐍', category: 'classico', description: 'Controle a cobra e coma as frutas sem bater nas paredes.' },
  { id: 'tetris', name: 'Tetris', emoji: '🧱', category: 'classico', description: 'Encaixe as pecas e complete linhas para pontuar.' },
  { id: 'pong', name: 'Pong', emoji: '🏓', category: 'classico', description: 'O classico jogo de ping-pong contra o computador.' },
  { id: 'breakout', name: 'Breakout', emoji: '🧱', category: 'classico', description: 'Destrua todos os blocos com a bola ricocheteando.' },
  { id: 'flappy-bird', name: 'Flappy Bird', emoji: '🐦', category: 'arcade', description: 'Toque para voar e desvie dos canos.' },
  { id: '2048', name: '2048', emoji: '🔢', category: 'puzzle', description: 'Deslize os numeros e combine ate chegar em 2048.' },
  { id: 'minesweeper', name: 'Campo Minado', emoji: '💣', category: 'puzzle', description: 'Encontre todas as minas sem explodir nenhuma.' },
  { id: 'memory', name: 'Jogo da Memoria', emoji: '🧠', category: 'puzzle', description: 'Encontre todos os pares de cartas iguais.' },
  { id: 'tic-tac-toe', name: 'Jogo da Velha', emoji: '❌', category: 'classico', description: 'X ou O? Venca o computador no jogo da velha.' },
  { id: 'space-invaders', name: 'Space Invaders', emoji: '👾', category: 'arcade', description: 'Defenda a Terra dos invasores espaciais.' },
];

const CATEGORIES = {
  todos: { label: 'Todos', emoji: '🎮' },
  classico: { label: 'Classicos', emoji: '👾' },
  arcade: { label: 'Arcade', emoji: '🕹️' },
  puzzle: { label: 'Puzzle', emoji: '🧩' },
  estrategia: { label: 'Estrategia', emoji: '♟️' },
};

// --- Utilitarios de Jogo ---
const MiniJogos = {
  formatScore(score) {
    return score.toString().padStart(6, '0');
  },

  saveHighScore(gameId, score) {
    const key = `minjogos_${gameId}_highscore`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    if (score > current) {
      localStorage.setItem(key, score.toString());
      return true;
    }
    return false;
  },

  getHighScore(gameId) {
    const key = `minjogos_${gameId}_highscore`;
    return parseInt(localStorage.getItem(key) || '0', 10);
  },

  isMobile() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  resizeCanvas(canvas, maxWidth, aspectRatio) {
    const parent = canvas.parentElement;
    const width = Math.min(parent.clientWidth, maxWidth);
    const height = width / aspectRatio;
    canvas.width = width;
    canvas.height = height;
    return { width, height };
  },
};

// --- Renderizar Cards de Jogos ---
function renderGameCards(games, container) {
  container.innerHTML = games.map(game => `
    <a href="games/${game.id}/index.html" class="game-card">
      <div class="game-card-thumb">${game.emoji}</div>
      <h3 class="game-card-title">${game.name}</h3>
      <p class="game-card-desc">${game.description}</p>
    </a>
  `).join('');
}

// --- Filtro por Categoria ---
function setupCategoryFilter(filterContainer, gamesContainer) {
  let activeCategory = 'todos';

  function render() {
    const filtered = activeCategory === 'todos'
      ? GAMES_CATALOG
      : GAMES_CATALOG.filter(g => g.category === activeCategory);

    renderGameCards(filtered, gamesContainer);

    filterContainer.querySelectorAll('.filter-tag').forEach(tag => {
      tag.classList.toggle('active', tag.dataset.category === activeCategory);
    });

    const countEl = document.querySelector('.section-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} jogos`;
    }
  }

  filterContainer.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => `
    <button class="filter-tag" data-category="${key}">${cat.emoji} ${cat.label}</button>
  `).join('');

  filterContainer.addEventListener('click', (e) => {
    const tag = e.target.closest('.filter-tag');
    if (!tag) return;
    activeCategory = tag.dataset.category;
    render();
  });

  render();
}

// --- Busca ---
function setupSearch(inputEl, gamesContainer) {
  inputEl.addEventListener('input', () => {
    const query = inputEl.value.toLowerCase().trim();
    if (!query) {
      renderGameCards(GAMES_CATALOG, gamesContainer);
      const countEl = document.querySelector('.section-count');
      if (countEl) countEl.textContent = `${GAMES_CATALOG.length} jogos`;
      return;
    }

    const filtered = GAMES_CATALOG.filter(g =>
      g.name.toLowerCase().includes(query) ||
      g.description.toLowerCase().includes(query) ||
      g.category.toLowerCase().includes(query)
    );

    renderGameCards(filtered, gamesContainer);
    const countEl = document.querySelector('.section-count');
    if (countEl) countEl.textContent = `${filtered.length} jogos`;
  });
}

// --- Mobile Menu Toggle ---
function setupMobileMenu() {
  const toggle = document.querySelector('.nav-menu-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    const isOpen = links.classList.contains('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav')) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();

  const gamesGrid = document.getElementById('games-grid');
  const filterTags = document.getElementById('filter-tags');
  const searchInput = document.getElementById('search-input');

  if (gamesGrid && filterTags) {
    setupCategoryFilter(filterTags, gamesGrid);
  }

  if (searchInput && gamesGrid) {
    setupSearch(searchInput, gamesGrid);
  }
});
