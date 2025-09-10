# finance-app
Aplicação para gestão de finanças.

## Estrutura

- `apps/api`: API em Node.js. Inicie com `npm start` para subir o servidor.
- `apps/web`: Interface web (Next.js) que consome a API.

## Configuração

Antes de rodar o `docker-compose`, copie os arquivos `.env.example` para `.env`:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### Variáveis de ambiente

| Serviço | Variável | Descrição |
| --- | --- | --- |
| API | DB_HOST | Host do banco PostgreSQL |
| API | DB_PORT | Porta do PostgreSQL |
| API | DB_USER | Usuário do banco |
| API | DB_PASSWORD | Senha do usuário |
| API | DB_NAME | Nome do banco |
| API | ALLOWED_ORIGIN | Origem permitida para requisições do frontend |
| API | DATA_ENCRYPTION_KEY | Chave de criptografia simétrica dos dados |
| API | PLUGGY_CLIENT_ID | Client ID do Pluggy |
| API | PLUGGY_CLIENT_SECRET | Client Secret do Pluggy |
| API | PLUGGY_BASE_URL | URL base da API do Pluggy |
| API | LOG_LEVEL | Nível de log da API |
| Web | NEXT_PUBLIC_API_URL | URL base da API consumida pelo frontend |
| Backup | PGHOST | Host do banco PostgreSQL (padrão `localhost`) |
| Backup | PGPORT | Porta do PostgreSQL (padrão `5432`) |
| Backup | PGUSER | Usuário do banco |
| Backup | PGPASSWORD | Senha do usuário |
| Backup | PGDATABASE | Banco de dados a ser exportado |
| Backup | DRIVE_FOLDER_ID | ID da pasta no Google Drive para os backups |
| Backup | GOOGLE_CLIENT_ID | Client ID OAuth2 |
| Backup | GOOGLE_CLIENT_SECRET | Client Secret OAuth2 |
| Backup | GOOGLE_REDIRECT_URI | Redirect URI do OAuth2 |
| Backup | GOOGLE_REFRESH_TOKEN | Refresh token autorizado |
| Backup | BACKUP_RETENTION_DAYS | Dias de retenção dos backups no Drive (padrão `7`) |
| Backup | CRON_SCHEDULE | Expressão cron para agendar o backup |

Para detalhes sobre a geração e restauração de backups, consulte [docs/backup.md](docs/backup.md).

## API

A API expõe endpoints REST para gerenciar usuários, contas bancárias e cartões.

- `GET /accounts`, `POST /accounts`, `GET /accounts/:id`, `PUT /accounts/:id`, `DELETE /accounts/:id`
- `GET /cards`, `POST /cards`, `GET /cards/:id`, `PUT /cards/:id`, `DELETE /cards/:id`

Campos sensíveis dessas entidades são armazenados criptografados com AES‑256 através da extensão `pgcrypto` do PostgreSQL.

## Backup

Consulte [docs/backup.md](docs/backup.md) para informações sobre geração de backups automáticos e restauração do banco de dados.
