-- ============================================================
--  PrideMarket — Sistema de Alertas Telegram
--  Execute no SQL Editor do Supabase (projeto mgylypvmgjebvpxhlmly)
-- ============================================================

-- 1. Sessões de vinculação (token gerado pelo site → chat_id preenchido pelo bot)
CREATE TABLE IF NOT EXISTS public.telegram_sessions (
    token       text        PRIMARY KEY,
    chat_id     text,
    username    text,
    first_name  text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL DEFAULT now() + INTERVAL '10 minutes'
);

-- RLS: qualquer um pode criar sessão (site não autenticado)
ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.telegram_sessions;
CREATE POLICY "Anyone can insert sessions"
    ON public.telegram_sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can read sessions by token" ON public.telegram_sessions;
CREATE POLICY "Anyone can read sessions by token"
    ON public.telegram_sessions FOR SELECT USING (true);

-- 2. Alertas de preço (watchlist dos usuários)
CREATE TABLE IF NOT EXISTS public.price_alerts (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id     text        NOT NULL,
    item_name   text        NOT NULL,
    min_price   numeric,
    max_price   numeric,
    active      boolean     NOT NULL DEFAULT true,
    notified_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_price_alerts_chat_id
    ON public.price_alerts (chat_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active
    ON public.price_alerts (active) WHERE active = true;

-- RLS: leitura/escrita por chat_id (validado pelo frontend via localStorage)
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read and write price_alerts" ON public.price_alerts;
CREATE POLICY "Public can read and write price_alerts"
    ON public.price_alerts FOR ALL USING (true) WITH CHECK (true);

-- 3. Limpeza automática de sessões expiradas (opcional, rodar periodicamente)
-- DELETE FROM public.telegram_sessions WHERE expires_at < now();

-- Verificação
SELECT 'telegram_sessions' AS tabela, COUNT(*) FROM public.telegram_sessions
UNION ALL
SELECT 'price_alerts', COUNT(*) FROM public.price_alerts;
