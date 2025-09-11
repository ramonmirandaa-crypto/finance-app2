# FinAI
FinAI é uma aplicação para gestão de finanças.

## Variáveis de ambiente

Copie os arquivos `.env.example` para `.env` dentro de `apps/api` e `apps/web`
ou defina as variáveis equivalentes no Portainer Stack.

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
