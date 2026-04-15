# Design System — Mini Jogos

## Paleta de Cores

### Cores Base
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg` | `#0f0f23` | Fundo principal (escuro) |
| `--color-bg-elevated` | `#1a1a3e` | Cards, modais, surfaces elevadas |
| `--color-bg-hover` | `#252552` | Hover em surfaces |
| `--color-surface` | `#2a2a5a` | Inputs, areas interativas |
| `--color-border` | `#3a3a6a` | Bordas sutis |
| `--color-border-strong` | `#5a5a8a` | Bordas com mais contraste |

### Cores de Texto
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-text` | `#e8e8f0` | Texto principal |
| `--color-text-muted` | `#9999bb` | Texto secundario |
| `--color-text-subtle` | `#666688` | Texto terciario, placeholders |

### Cores de Destaque
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#7c5cff` | Acoes primarias, links, CTAs |
| `--color-primary-hover` | `#9b7fff` | Hover em primarias |
| `--color-primary-soft` | `rgba(124, 92, 255, 0.15)` | Backgrounds sutis de primary |
| `--color-accent` | `#00e5a0` | Destaque secundario, scores, sucesso |
| `--color-accent-hover` | `#33edb8` | Hover em accent |
| `--color-warning` | `#ffb347` | Avisos |
| `--color-danger` | `#ff5757` | Erros, game over |

## Tipografia

- **Font stack**: `'Inter', system-ui, -apple-system, sans-serif`
- **Mono**: `'JetBrains Mono', 'Fira Code', monospace` (scores, timers)

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-size-xs` | `0.75rem` | Labels pequenos |
| `--font-size-sm` | `0.875rem` | Texto secundario |
| `--font-size-base` | `1rem` | Texto padrao (16px) |
| `--font-size-lg` | `1.25rem` | Subtitulos |
| `--font-size-xl` | `1.5rem` | Titulos de secao |
| `--font-size-2xl` | `2rem` | Titulos de pagina |
| `--font-size-3xl` | `2.5rem` | Hero, nome do site |
| `--font-weight-normal` | `400` | Texto corrido |
| `--font-weight-medium` | `500` | Enfase leve |
| `--font-weight-semibold` | `600` | Subtitulos |
| `--font-weight-bold` | `700` | Titulos |
| `--line-height-tight` | `1.2` | Titulos |
| `--line-height-normal` | `1.5` | Texto corrido |
| `--line-height-relaxed` | `1.75` | Texto longo |

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

## Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `0.375rem` | Botoes pequenos, badges |
| `--radius-md` | `0.5rem` | Inputs, botoes |
| `--radius-lg` | `0.75rem` | Cards |
| `--radius-xl` | `1rem` | Modais, paineis grandes |
| `--radius-full` | `9999px` | Circulos, pills |

## Sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Elementos sutis |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Cards |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | Modais, dropdowns |
| `--shadow-glow` | `0 0 20px rgba(124,92,255,0.3)` | Destaque neon em hover |

## Transicoes

| Token | Valor |
|-------|-------|
| `--transition-fast` | `150ms ease` |
| `--transition-base` | `250ms ease` |
| `--transition-slow` | `400ms ease` |

## Breakpoints

| Nome | Valor | Uso |
|------|-------|-----|
| sm | `640px` | Mobile landscape |
| md | `768px` | Tablet |
| lg | `1024px` | Desktop |
| xl | `1280px` | Desktop grande |

## Componentes

### Game Card
- Background: `--color-bg-elevated`
- Border: `1px solid var(--color-border)`
- Radius: `--radius-lg`
- Padding: `--space-4`
- Hover: borda `--color-primary`, sombra `--shadow-glow`
- Thumbnail: aspect-ratio 16/10, radius `--radius-md`
- Titulo: `--font-size-lg`, `--font-weight-semibold`
- Descricao: `--font-size-sm`, `--color-text-muted`

### Botoes
- **Primary**: bg `--color-primary`, texto white, hover `--color-primary-hover`
- **Secondary**: bg transparent, borda `--color-border-strong`, hover bg `--color-bg-hover`
- **Ghost**: bg transparent, sem borda, hover bg `--color-bg-hover`
- Padding: `--space-2 --space-4`
- Radius: `--radius-md`
- Font: `--font-size-sm`, `--font-weight-medium`
- Transicao: `--transition-fast`

### Navegacao
- Fixa no topo
- Background: `--color-bg` com backdrop-filter blur
- Border-bottom: `--color-border`
- Logo + links de navegacao
- Altura: 64px

### Footer
- Background: `--color-bg-elevated`
- Border-top: `--color-border`
- Texto: `--color-text-muted`
- Padding: `--space-8` vertical

### Score Display (dentro dos jogos)
- Font: monospace stack
- Tamanho: `--font-size-xl`
- Cor: `--color-accent`
- Peso: `--font-weight-bold`
