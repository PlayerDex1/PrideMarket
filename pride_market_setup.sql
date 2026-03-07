-- ============================================================
--  PrideMarket — Tabela dedicada: pride_market_items
--  Execute este script no SQL Editor do Supabase
--  Projeto: mgylypvmgjebvpxhlmly
-- ============================================================

-- 1. Cria a tabela limpa exclusiva do Pride
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pride_market_items (
    id          text        PRIMARY KEY,           -- ID da mensagem do Discord
    name        text        NOT NULL,              -- Nome do item (já limpo, sem "was added on the market")
    price       numeric     NOT NULL DEFAULT 0,    -- Preço em Pride Coin (3 casas decimais)
    currency    text        NOT NULL DEFAULT 'Pride Coin',
    timestamp   timestamptz NOT NULL DEFAULT now(),
    icon_url    text,                              -- URL do ícone do item
    created_at  timestamptz NOT NULL DEFAULT now() -- Quando foi inserido no banco
);

-- 2. Índices para performance
-- ============================================================
-- Busca por nome (LIKE %...%)
CREATE INDEX IF NOT EXISTS idx_pride_market_name
    ON public.pride_market_items USING gin (to_tsvector('simple', name));

-- Ordenação por data (mais usada)
CREATE INDEX IF NOT EXISTS idx_pride_market_timestamp
    ON public.pride_market_items (timestamp DESC);

-- Índice simples para busca LIKE
CREATE INDEX IF NOT EXISTS idx_pride_market_name_btree
    ON public.pride_market_items (name text_pattern_ops);

-- 3. RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.pride_market_items ENABLE ROW LEVEL SECURITY;

-- Leitura pública (frontend pode ler sem autenticação)
DROP POLICY IF EXISTS "Pride market items viewable by everyone" ON public.pride_market_items;
CREATE POLICY "Pride market items viewable by everyone"
    ON public.pride_market_items
    FOR SELECT
    USING (true);

-- Service Role pode inserir/atualizar/deletar (usado pelo poller no Railway)
-- O Service Role Key bypassa RLS automaticamente, então não precisamos de policy de INSERT.

-- 4. Comentários das colunas (documentação)
-- ============================================================
COMMENT ON TABLE  public.pride_market_items               IS 'Listagens do mercado do servidor Pride (L2 Essence)';
COMMENT ON COLUMN public.pride_market_items.id            IS 'ID único da mensagem no Discord';
COMMENT ON COLUMN public.pride_market_items.name          IS 'Nome do item já normalizado (sem sufixo Discord)';
COMMENT ON COLUMN public.pride_market_items.price         IS 'Preço em Pride Coin — use 3 casas decimais';
COMMENT ON COLUMN public.pride_market_items.currency      IS 'Sempre "Pride Coin" para este servidor';
COMMENT ON COLUMN public.pride_market_items.timestamp     IS 'Data/hora que o item foi postado no mercado';
COMMENT ON COLUMN public.pride_market_items.icon_url      IS 'URL do ícone do item (l2db.info ou similar)';

-- 5. Verificação final
-- ============================================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pride_market_items'
ORDER BY ordinal_position;
