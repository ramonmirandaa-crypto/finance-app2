# finance-app
Aplicação para gestão de finanças.

## Monitoramento de erros

O backend (`apps/api`) e o frontend (`apps/web`) utilizam [Sentry](https://sentry.io/) para registrar exceções.

1. Defina as variáveis de ambiente:
   - `SENTRY_DSN` para a API e para o lado servidor do Next.js.
   - `NEXT_PUBLIC_SENTRY_DSN` para o cliente web.
   Consulte os arquivos `.env.example` em cada aplicativo.
2. Inicialize a aplicação normalmente (`docker-compose up` ou scripts locais).

### Visualizar logs

Os eventos podem ser acompanhados no painel do Sentry. Acesse o projeto configurado e utilize a aba **Issues** para ver detalhes das falhas capturadas.

### Configurar alertas

No painel do Sentry, navegue até **Alerts → Create Alert** para definir regras de notificação por e-mail, Slack ou outros integradores sempre que novos erros forem registrados.
