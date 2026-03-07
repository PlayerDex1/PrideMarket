-- ============================================================
--  PrideMarket — Tabela de STAGING/DESENVOLVIMENTO
--  Execute este script no SQL Editor do Supabase
--  Use apenas para testar novas funcionalidades
-- ============================================================

-- 1. Cria a tabela de dev (mesma estrutura da produção)
CREATE TABLE IF NOT EXISTS public.pride_market_items_dev (
    id          text        PRIMARY KEY,
    name        text        NOT NULL,
    price       numeric     NOT NULL DEFAULT 0,
    currency    text        NOT NULL DEFAULT 'Pride Coin',
    timestamp   timestamptz NOT NULL DEFAULT now(),
    icon_url    text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_pride_market_dev_name
    ON public.pride_market_items_dev (name text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_pride_market_dev_timestamp
    ON public.pride_market_items_dev (timestamp DESC);

-- 3. RLS
ALTER TABLE public.pride_market_items_dev ENABLE ROW LEVEL SECURITY;

-- Leitura pública
DROP POLICY IF EXISTS "Dev market items viewable by everyone" ON public.pride_market_items_dev;
CREATE POLICY "Dev market items viewable by everyone"
    ON public.pride_market_items_dev
    FOR SELECT
    USING (true);

-- Service Role pode inserir (bypassa RLS automaticamente)

COMMENT ON TABLE public.pride_market_items_dev IS 'Tabela de staging — cópia da pride_market_items para testes';

-- 4. Verificação
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pride_market_items_dev'
ORDER BY ordinal_position;
