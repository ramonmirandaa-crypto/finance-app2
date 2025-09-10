# finance-app
Aplicação para gestão de finanças.

## Estrutura

- `apps/api`: API em Node.js. Inicie com `npm start` para subir o servidor.
- `apps/web`: Interface web (Next.js) que consome a API.

## Configuração

A aplicação web espera a variável de ambiente `NEXT_PUBLIC_API_URL` contendo a URL base da API.

## API

A API expõe endpoints REST para gerenciar usuários, contas bancárias e cartões.

- `GET /accounts`, `POST /accounts`, `GET /accounts/:id`, `PUT /accounts/:id`, `DELETE /accounts/:id`
- `GET /cards`, `POST /cards`, `GET /cards/:id`, `PUT /cards/:id`, `DELETE /cards/:id`

Campos sensíveis dessas entidades são armazenados criptografados com AES‑256 através da extensão `pgcrypto` do PostgreSQL.

### Variáveis de ambiente

- `DATA_ENCRYPTION_KEY`: chave usada para criptografia simétrica dos dados (opcional, padrão `devkey`).
- `PLUGGY_BASE_URL`: URL base da API do Pluggy (padrão `https://api.pluggy.ai`).
  Use `https://api.meupluggy.com` para conectar ao MeuPluggy.
- `LOG_LEVEL`: define o nível de log da API (`info`, `debug`, etc.); padrão `info`.

## Backup

Consulte [docs/backup.md](docs/backup.md) para informações sobre geração de backups automáticos e restauração do banco de dados.
