# API

## Testes

1. Suba um banco Postgres para testes (exemplo usando Docker):
   ```bash
   docker run --rm --name finance-api-test-db -e POSTGRES_DB=finance_test \
     -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 -d postgres:16
   ```
2. No diretório `apps/api`, instale as dependências e execute os testes:
   ```bash
   NODE_OPTIONS=--experimental-vm-modules npm test
   ```

As variáveis de ambiente utilizadas nos testes estão no arquivo `.env.test`.
