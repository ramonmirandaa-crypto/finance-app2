# finance-app
Aplicação para gestão de finanças.

## Design

Tokens de cor e espaçamento estão centralizados em `styles/theme.css`:

- `--color-primary`: #1d4ed8
- `--color-border`: #cbd5e1
- `--color-surface-start`: rgba(255, 255, 255, 0.7)
- `--color-surface-end`: rgba(255, 255, 255, 0.35)
- `--space-xs`: 10px
- `--space-sm`: 12px
- `--space-lg`: 24px

A página de login utiliza CSS Modules (`apps/web/app/login/page.module.css`) com as classes:

- `main`: layout centralizado da página
- `form`: cartão de login
- `title`: cabeçalho
- `input`: campos de entrada
- `button`: ação principal
- `message`: mensagens de status
- `signup`: link para cadastro
