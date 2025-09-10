# Backup e restauração

Este projeto inclui um script para geração de backups do PostgreSQL e envio automático para o Google Drive.

## Configuração

Defina as seguintes variáveis de ambiente:

| Variável | Descrição |
| --- | --- |
| `PGHOST` | Host do banco PostgreSQL (padrão `localhost`) |
| `PGPORT` | Porta do PostgreSQL (padrão `5432`) |
| `PGUSER` | Usuário do banco |
| `PGPASSWORD` | Senha do usuário |
| `PGDATABASE` | Banco de dados a ser exportado |
| `DRIVE_FOLDER_ID` | ID da pasta no Google Drive que receberá os backups |
| `GOOGLE_CLIENT_ID` | Client ID OAuth2 |
| `GOOGLE_CLIENT_SECRET` | Client Secret OAuth2 |
| `GOOGLE_REDIRECT_URI` | Redirect URI utilizado na configuração do OAuth2 |
| `GOOGLE_REFRESH_TOKEN` | Refresh token com permissão para o Google Drive |
| `BACKUP_RETENTION_DAYS` | Quantidade de dias a manter backups no Drive (padrão `7`) |
| `CRON_SCHEDULE` | Expressão cron para agendamento do backup. Se ausente, o backup é executado imediatamente |

Instale as dependências e execute:

```bash
npm run backup
```

O script gera o dump, envia para o Drive e remove backups antigos conforme a política de retenção.

## Restauração

1. Baixe o arquivo de backup desejado da pasta do Google Drive.
2. Execute o comando abaixo, informando o banco de destino e o caminho do arquivo:

```bash
pg_restore -d <nome_do_banco> -Fc <arquivo.dump>
```

Este comando restaura o banco usando o formato custom (`-Fc`) gerado pelo script.
