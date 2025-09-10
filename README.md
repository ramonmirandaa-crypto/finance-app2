# finance-app
Aplicação para gestão de finanças.

## Estrutura

- `apps/api`: API em Node.js. Inicie com `npm start` para subir o servidor.
- `apps/web`: Interface web (Next.js) que consome a API.

## Configuração

A aplicação web espera a variável de ambiente `NEXT_PUBLIC_API_URL` contendo a URL base da API.
