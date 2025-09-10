# finance-app
Aplicação para gestão de finanças.

## Configuração do Frontend

Crie um arquivo `.env` dentro de `apps/web` com a variável abaixo para definir a URL da API consumida pelo frontend:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Sem essa variável, o frontend emitirá um erro ao inicializar.
