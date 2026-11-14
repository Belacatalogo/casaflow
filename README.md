# CasaFlow

Organizador mensal de compras da casa. Cadastre o que precisa, registre o valor pago e acompanhe projeção, histórico e a quantidade sugerida para o mês inteiro.

Os dados ficam no aparelho: compras e catálogo no IndexedDB, preferências (tema, orçamento, nome da casa) também no armazenamento local. Não há conta nem servidor de dados.

## Telas

- **Início** — mês atual, realizado contra orçamento, ritmo e leitura do consumo
- **Lista** — planejar, editar e marcar compras
- **Comprando agora** — modo de corredor, com toque grande
- **Catálogo** — produtos recorrentes, preço e sugestão para 30 dias
- **Análises** — ranking, comparativo e lista sugerida do próximo mês
- **Histórico** — filtros por mês, categoria e status
- **Ajustes** — orçamento, pessoas, categorias, tema, exportar e importar

O primeiro acesso abre uma casa de exemplo, para o app já ter gráfico e histórico.

## Publicar

O projeto sobe na Vercel a partir desta pasta. Na prévia, use Publicar. Para clonar e rodar localmente:

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
```
