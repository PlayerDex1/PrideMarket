import { createClient } from '@supabase/supabase-js';
import TelegramBot from 'node-telegram-bot-api';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const TABLE = process.env.TABLE_NAME || 'pride_market_items';
const SITE_URL = process.env.SITE_URL || 'https://market.prideessence.club';
const CHECK_INTERVAL_MS = 30_000; // 30 segundos

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function runAlertChecker(bot: TelegramBot) {
    console.log('🔔 AlertChecker iniciado — verificando a cada 30s...');

    setInterval(async () => {
        try {
            await checkAlerts(bot);
        } catch (err) {
            console.error('❌ AlertChecker erro:', err);
        }
    }, CHECK_INTERVAL_MS);

    // Roda imediatamente na primeira vez
    await checkAlerts(bot);
}

async function checkAlerts(bot: TelegramBot) {
    // Busca todos os alertas ativos
    const { data: alerts } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('active', true);

    if (!alerts || alerts.length === 0) return;

    // Busca itens das últimas 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: items } = await supabase
        .from(TABLE)
        .select('id, name, price, currency, timestamp')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false });

    if (!items || items.length === 0) return;

    for (const alert of alerts) {
        // Última notificação enviada
        const lastNotified = alert.notified_at ? new Date(alert.notified_at) : new Date(0);

        // Verifica itens que correspondem ao alerta
        const matches = items.filter(item => {
            const itemDate = new Date(item.timestamp);
            if (itemDate <= lastNotified) return false; // já notificou este item

            const nameMatch = item.name.toLowerCase().includes(alert.item_name.toLowerCase());
            if (!nameMatch) return false;

            const price = Number(item.price);
            const minOk = alert.min_price === null || price >= Number(alert.min_price);
            const maxOk = alert.max_price === null || price <= Number(alert.max_price);
            return minOk && maxOk;
        });

        if (matches.length === 0) continue;

        // Envia notificação para cada match (máximo 3 por vez)
        for (const item of matches.slice(0, 3)) {
            const price = Number(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 3 });
            const minStr = alert.min_price !== null ? `${Number(alert.min_price).toLocaleString('pt-BR')}` : '–';
            const maxStr = alert.max_price !== null ? `${Number(alert.max_price).toLocaleString('pt-BR')}` : '–';
            const timeAgo = getTimeAgo(new Date(item.timestamp));
            const itemUrl = `${SITE_URL}/item/${encodeURIComponent(item.name)}`;

            const message =
                `🔔 *Alerta de Mercado — PrideMarket*\n\n` +
                `📦 *Item:* ${item.name}\n` +
                `💰 *Preço atual:* ${price} ${item.currency}\n` +
                `📊 *Seu range:* ${minStr} – ${maxStr} Pride Coin\n` +
                `🕐 *Postado:* ${timeAgo}\n\n` +
                `👉 [Ver no site](${itemUrl})`;

            try {
                await bot.sendMessage(alert.chat_id, message, {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                });

                // Atualiza notified_at
                await supabase
                    .from('price_alerts')
                    .update({ notified_at: new Date().toISOString() })
                    .eq('id', alert.id);

                console.log(`✅ Alerta enviado: ${item.name} → chat_id ${alert.chat_id}`);
            } catch (err: any) {
                if (err.code === 403) {
                    // Usuário bloqueou o bot — desativa o alerta
                    await supabase
                        .from('price_alerts')
                        .update({ active: false })
                        .eq('id', alert.id);
                    console.log(`⚠️ Alerta desativado (bot bloqueado): chat_id ${alert.chat_id}`);
                }
            }
        }
    }
}

function getTimeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `há ${diff} segundos`;
    if (diff < 3600) return `há ${Math.floor(diff / 60)} minutos`;
    return `há ${Math.floor(diff / 3600)} horas`;
}
