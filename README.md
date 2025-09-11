# FinAI
FinAI é uma aplicação para gestão de finanças.

## Variáveis de ambiente

Copie os arquivos `.env.example` para `.env` dentro de `apps/api` e `apps/web`
ou defina as variáveis equivalentes no Portainer Stack.

As migrações do banco de dados usam `knexfile.js`, que lê as variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD`.

### API (`apps/api`)

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finai
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=changeme
```

### Frontend (`apps/web`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Sem essas variáveis, as aplicações podem não inicializar corretamente.
