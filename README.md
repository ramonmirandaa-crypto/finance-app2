# finance-app
Aplicação para gestão de finanças.

## Rotas

- `GET /api/health`: retorna o status da API.
- `GET /api/version`: exibe a versão da aplicação.

## Configuração do Banco de Dados

Defina as variáveis de ambiente em um arquivo `.env`:

```
DATABASE_HOST=localhost
POSTGRES_USER=seu_usuario
POSTGRES_PASSWORD=sua_senha
POSTGRES_DB=finance
```

Após configurar, execute as migrações com:

```
npx knex migrate:latest
```

## Scripts

- `npm start`: inicia o servidor.
- `npm test`: executa os testes automatizados.
