# Git Workflow — PrideMarket

## Branches

| Branch    | Ambiente   | URL                                          | Tabela Supabase          |
|-----------|------------|----------------------------------------------|--------------------------|
| `main`    | Produção   | market.prideessence.club                     | `pride_market_items`     |
| `develop` | Staging    | pride-market-git-develop-holdboys-projects.vercel.app | `pride_market_items_dev` |

---

## Fluxo de Trabalho

### ✅ Sempre que for desenvolver algo novo:

```bash
# 1. Garanta que está no branch develop
git checkout develop

# 2. Crie um branch específico para a feature
git checkout -b feature/nome-da-feature

# 3. Faça as alterações e commit
git add .
git commit -m "feat: descrição da funcionalidade"

# 4. Envie para GitHub
git push origin feature/nome-da-feature

# 5. Abra um Pull Request: feature → develop (teste no staging)
```

### ✅ Quando a feature for aprovada no staging:

```bash
# Merge develop → main (vai para produção)
git checkout main
git merge develop
git push origin main
```

---

## Padrão de Commit Messages

| Prefixo   | Quando usar                             |
|-----------|-----------------------------------------|
| `feat:`   | Nova funcionalidade                     |
| `fix:`    | Correção de bug                         |
| `style:`  | Mudanças visuais/CSS                    |
| `refactor:` | Refatoração de código               |
| `security:` | Melhorias de segurança              |
| `docs:`   | Documentação                            |
| `chore:`  | Configurações, dependências             |

**Exemplos:**
```
feat: adicionar filtro por intervalo de preço
fix: corrigir casas decimais no preço
style: ajustar cores do Top Itens
security: remover chave hardcoded do poller
```

---

## Vercel — Configuração de Branches

- `main` → Deploy automático em Produção
- `develop` → Deploy automático em Preview (Staging)
- `feature/*` → Deploy automático em Preview temporário (por PR)

---

## Checklist antes de fazer merge para `main`

- [ ] Testado no staging (develop)
- [ ] Build passou sem erros (`npm run build`)
- [ ] Dados aparecem corretamente no frontend
- [ ] Nenhuma chave secreta no código
- [ ] Commit message segue o padrão
