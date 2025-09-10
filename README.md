# finance-app
Aplicação para gestão de finanças.

## Variáveis de ambiente

O serviço de API utiliza as seguintes variáveis para se autenticar na Pluggy:

```
PLUGGY_CLIENT_ID=seu_client_id
PLUGGY_CLIENT_SECRET=seu_client_secret
PLUGGY_BASE_URL=https://api.pluggy.ai
```

Defina esses valores no arquivo `.env` dentro de `apps/api/` (use o modelo `.env.example`).
`PLUGGY_BASE_URL` é opcional e permite apontar para um endpoint personalizado; por padrão utiliza https://api.pluggy.ai.
