# Site Mini Jogos — Regras do Projeto

## Stack
- HTML/CSS/JS puro — ZERO dependencias externas
- Jogos em HTML5 Canvas API
- CSS com custom properties (design tokens)
- Sem npm, webpack, bundlers, ou frameworks

## Estrutura de Diretorios

```
site-minjogos/
├── index.html              # Homepage com catalogo
├── css/
│   ├── design-system.css   # Tokens, reset, tipografia
│   ├── components.css      # Cards, botoes, nav, footer
│   └── layout.css          # Grid, containers, responsividade
├── js/
│   └── main.js             # Utilitarios compartilhados
├── games/
│   ├── _template/          # Template para novos jogos
│   │   ├── index.html
│   │   ├── game.js
│   │   └── style.css
│   └── nome-do-jogo/       # Cada jogo em sua pasta
│       ├── index.html
│       ├── game.js
│       └── style.css
├── assets/
│   ├── icons/
│   └── images/
└── scripts/                # Scripts de automacao
```

## Convencoes

### CSS
- Mobile-first (min-width media queries)
- Usar SOMENTE as variaveis definidas em design-system.css
- Nunca usar cores hardcoded — sempre `var(--cor-semantica)`
- Classes com kebab-case: `.game-card`, `.btn-primary`
- Nao usar !important

### HTML
- Semantico: `<header>`, `<main>`, `<section>`, `<footer>`, `<nav>`
- Atributos alt em todas as imagens
- Lang="pt-BR" em todos os documentos
- Cada pagina importa os 3 CSS na ordem: design-system, components, layout

### JavaScript
- Vanilla JS — sem jQuery, sem libs
- camelCase para variaveis e funcoes
- UPPER_SNAKE_CASE para constantes
- Cada jogo e auto-contido em seu game.js
- Utilitarios compartilhados em /js/main.js

### Jogos (Canvas)
- Cada jogo em `/games/nome-do-jogo/` (kebab-case)
- Usar o template em `/games/_template/` como base
- Canvas responsivo — adaptar ao container pai
- Suportar teclado E touch (mobile)
- Incluir obrigatoriamente: titulo, instrucoes, score, botao restart
- Importar design-system.css e components.css para a pagina wrapper
- Logica do jogo isolada em game.js (classe ou modulo)

### Commits
- Mensagens em portugues
- Formato: "tipo: descricao curta"
- Tipos: feat, fix, style, refactor, docs, chore

## Design System
Consultar `/design-system.md` para tokens, cores, tipografia e componentes.
Consultar `/css/design-system.css` para implementacao.
