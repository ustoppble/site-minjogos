# Design System — Mini Jogos

**Estetica**: Inspirado no Supabase — near-black, verde esmeralda, bordas translucidas, tipografia moderna.

## Paleta de Cores

### Cores Base
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg` | `#050505` | Fundo principal (near-black) |
| `--color-bg-alt` | `#080808` | Fundo alternativo |
| `--color-bg-elevated` | `#0c0c0c` | Cards, modais, surfaces elevadas |
| `--color-bg-hover` | `#141414` | Hover em surfaces |
| `--color-surface` | `#1a1a1a` | Inputs, areas interativas |
| `--color-surface-hover` | `#222222` | Hover em surfaces interativas |

### Bordas
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-border` | `rgba(255, 255, 255, 0.05)` | Bordas sutis |
| `--color-border-strong` | `rgba(255, 255, 255, 0.1)` | Bordas com mais contraste |
| `--color-border-hover` | `rgba(255, 255, 255, 0.15)` | Bordas em hover |

### Cores de Texto
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-text` | `#ededed` | Texto principal |
| `--color-text-muted` | `#878787` | Texto secundario |
| `--color-text-subtle` | `#4a4a4a` | Texto terciario, placeholders |

### Cores de Destaque
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#3ECF8E` | Verde esmeralda — acoes primarias, links, CTAs |
| `--color-primary-hover` | `#4AE09C` | Hover em primarias |
| `--color-primary-soft` | `rgba(62, 207, 142, 0.08)` | Backgrounds sutis de primary |
| `--color-primary-glow` | `rgba(62, 207, 142, 0.15)` | Glow effects |
| `--color-accent` | `#8B5CF6` | Violeta — destaque secundario |
| `--color-accent-hover` | `#A78BFA` | Hover em accent |
| `--color-accent-soft` | `rgba(139, 92, 246, 0.08)` | Background sutil de accent |
| `--color-warning` | `#EAB308` | Avisos, recordes |
| `--color-danger` | `#EF4444` | Erros, game over |
| `--color-info` | `#3B82F6` | Informacoes |

## Tipografia

- **Font stack**: `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`
- **Mono**: `'IBM Plex Mono', 'JetBrains Mono', monospace` (scores, timers, contadores)
- **Import**: Via Google Fonts (`@import` no design-system.css)

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-size-xs` | `0.75rem` | Labels, badges |
| `--font-size-sm` | `0.8125rem` | Texto secundario, nav links |
| `--font-size-base` | `0.9375rem` | Texto padrao (15px) |
| `--font-size-lg` | `1.125rem` | Subtitulos |
| `--font-size-xl` | `1.375rem` | Titulos de secao |
| `--font-size-2xl` | `1.875rem` | Titulos de pagina |
| `--font-size-3xl` | `2.5rem` | Hero, titulos grandes |
| `--font-size-4xl` | `3.25rem` | Hero principal |

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-weight-normal` | `400` | Texto corrido |
| `--font-weight-medium` | `500` | Enfase leve, nav links |
| `--font-weight-semibold` | `600` | Subtitulos, labels |
| `--font-weight-bold` | `700` | Titulos |
| `--font-weight-extrabold` | `800` | Hero title |

| Token | Valor | Uso |
|-------|-------|-----|
| `--line-height-tight` | `1.15` | Titulos grandes |
| `--line-height-snug` | `1.3` | Subtitulos |
| `--line-height-normal` | `1.6` | Texto corrido |
| `--line-height-relaxed` | `1.75` | Texto longo |

| Token | Valor | Uso |
|-------|-------|-----|
| `--letter-spacing-tight` | `-0.02em` | Titulos |
| `--letter-spacing-normal` | `0` | Texto padrao |
| `--letter-spacing-wide` | `0.04em` | Labels uppercase |

## Espacamento

| Token | Valor |
|-------|-------|
| `--space-1` | `0.25rem` (4px) |
| `--space-2` | `0.5rem` (8px) |
| `--space-3` | `0.75rem` (12px) |
| `--space-4` | `1rem` (16px) |
| `--space-5` | `1.25rem` (20px) |
| `--space-6` | `1.5rem` (24px) |
| `--space-8` | `2rem` (32px) |
| `--space-10` | `2.5rem` (40px) |
| `--space-12` | `3rem` (48px) |
| `--space-16` | `4rem` (64px) |
| `--space-20` | `5rem` (80px) |
| `--space-24` | `6rem` (96px) |

## Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `0.25rem` | Badges pequenos |
| `--radius-md` | `0.5rem` | Botoes, inputs |
| `--radius-lg` | `0.75rem` | Cards internos, canvas |
| `--radius-xl` | `1rem` | Cards principais, wrappers |
| `--radius-2xl` | `1.25rem` | Paineis grandes |
| `--radius-full` | `9999px` | Circulos, pills, filter tags |

## Sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Elementos sutis |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.5)` | Cards |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.6)` | Modais, dropdowns |
| `--shadow-glow` | `0 0 24px rgba(62,207,142,0.15)` | Hover em cards (glow verde) |
| `--shadow-glow-strong` | `0 0 40px rgba(62,207,142,0.25)` | Destaque forte |

## Transicoes

| Token | Valor | Uso |
|-------|-------|-----|
| `--transition-fast` | `150ms ease` | Hover, foco |
| `--transition-base` | `250ms ease` | Transformacoes de cards |
| `--transition-slow` | `400ms ease` | Animacoes maiores |
| `--transition-spring` | `300ms cubic-bezier(0.34, 1.56, 0.64, 1)` | Bounce effects |

## Breakpoints

| Nome | Valor | Uso |
|------|-------|-----|
| sm | `640px` | Mobile landscape |
| md | `768px` | Tablet |
| lg | `1024px` | Desktop |
| xl | `1280px` | Desktop grande |

## Componentes

### Navegacao
- Fixa no topo, 64px de altura
- Background: `rgba(5, 5, 5, 0.8)` com `backdrop-filter: blur(16px) saturate(180%)`
- Border-bottom: `var(--color-border)`
- Logo: "Mini" em verde (`--color-primary`), "Jogos" em branco
- Links: `--font-size-sm`, `--font-weight-medium`, pills com hover
- Mobile: hamburger menu com dropdown animado

### Game Card
- Background: `--color-bg-elevated`
- Border: `1px solid var(--color-border)`
- Radius: `--radius-xl`
- Padding: `--space-4`
- Hover: border verde translucido, `--shadow-glow`, `translateY(-2px)`
- Pseudo-element `::before`: gradient verde sutil que aparece no hover
- Thumbnail: aspect-ratio 16/10, radius `--radius-lg`
- Titulo: `--font-size-base`, `--font-weight-semibold`
- Descricao: `--font-size-sm`, `--color-text-muted`

### Category Card
- Mesmo padrao do game card, com `--radius-xl`
- Pseudo-element `::before`: linha gradiente (verde→violeta) no topo, aparece no hover
- Count: uppercase, `--font-size-xs`, cor `--color-primary`
- Padding: `--space-6`

### Botoes
- **Primary**: bg `--color-primary`, texto `#000` (preto no verde), hover com glow
- **Secondary**: bg transparent, borda `--color-border-strong`, hover bg `--color-bg-hover`
- **Ghost**: bg transparent, sem borda, hover bg `--color-bg-hover`
- Padding: `--space-2 --space-5`
- Radius: `--radius-md`
- Font: `--font-size-sm`, `--font-weight-medium`
- Large: `--space-3 --space-8`, `--radius-lg`

### Hero Section
- Pseudo-element `::before`: glow radial verde sutil (elipse grande, opacity 0.08)
- Titulo: `--font-size-4xl`, `--font-weight-extrabold`, letter-spacing `-0.03em`
- Subtitulo: `--font-size-lg`, `--color-text-muted`, max-width 520px
- Gradient line decorativa: 80px, linear-gradient verde→violeta

### Footer
- Border-top: `var(--color-border)`
- Layout: flex, space-between
- Texto: `--color-text-subtle`, `--font-size-sm`
- Links: `--color-text-muted`, hover `--color-text`

### Search + Filters
- Input: bg `--color-surface`, border `--color-border`, focus ring verde
- Filter tags: pills com `--radius-full`, border, active state verde
- Active tag: bg `--color-primary-soft`, border verde, texto verde

### Score Display (jogos)
- Font: `--font-mono`
- Tamanho: `--font-size-xl`
- Cor: `--color-primary` (verde)
- Peso: `--font-weight-bold`
- Label: uppercase, `--font-size-xs`, `--color-text-subtle`

### Game Instructions
- Border: `1px solid var(--color-border)`
- Radius: `--radius-xl`
- h3: barra verde vertical (3px) como marcador
- Items: prefixo "—" em `--color-text-subtle`

### Badge / Pill
- bg `--color-primary-soft`, border verde translucido
- Texto: `--color-primary`, `--font-size-xs`
- Radius: `--radius-full`

### Dot Grid Background
- Fundo de pontos via `radial-gradient`
- Pontos: `rgba(255, 255, 255, 0.03)`, grid 24x24px
- Aplicado via classe `.dot-grid` em todas as paginas

## Efeitos Especiais

### Glow Radial (Hero)
Background radial com verde a baixa opacidade no topo do hero, criando profundidade atmosferica.

### Gradient Line
Linha decorativa 80x2px com `linear-gradient(90deg, --color-primary, --color-accent)` usada como separador visual.

### Card Hover Gradient
Pseudo-element com gradiente verde sutil que aparece de cima para baixo no hover dos cards.

### Category Card Top Line
Linha gradiente no topo do card (2px) que aparece no hover.

### Glass-morphism Nav
Backdrop blur + saturate na nav para efeito de vidro translucido.
