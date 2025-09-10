# finance-app
Aplicação para gestão de finanças.

## Cobertura de Testes

Cada pacote possui testes configurados com [Jest](https://jestjs.io/). Para gerar o relatório de cobertura execute os comandos abaixo a partir da raiz do projeto:

```bash
cd apps/api && npm test
cd ../web && npm test
```

Ao final da execução será criada uma pasta `coverage` em cada aplicação. O relatório em formato HTML pode ser aberto em `coverage/lcov-report/index.html`. Percentuais são exibidos no terminal e ajudam a identificar partes do código que não estão cobertas por testes.
