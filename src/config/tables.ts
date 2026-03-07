/**
 * Configuração de tabelas do Supabase
 * - Produção (main):  pride_market_items
 * - Staging (develop): pride_market_items_dev
 *
 * Para trocar o ambiente, configure VITE_TABLE_NAME nas variáveis do Vercel:
 *   Preview  → pride_market_items_dev
 *   Production → pride_market_items
 */
export const MARKET_TABLE = (import.meta.env.VITE_TABLE_NAME as string) || 'pride_market_items';
