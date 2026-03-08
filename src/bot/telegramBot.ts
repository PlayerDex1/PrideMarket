import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.SITE_URL || 'https://market.prideessence.club';

// bot é null até initBot() ser chamada
let _bot: TelegramBot | null = null;

export function getBot(): TelegramBot | null {
    return _bot;
}

export function initBot(): TelegramBot | null {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!BOT_TOKEN) {
        console.warn('⚠️  TELEGRAM_BOT_TOKEN não configurado — bot Telegram desativado.');
        return null;
    }

    _bot = new TelegramBot(BOT_TOKEN, { polling: true });
    const bot = _bot;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('🤖 PrideMarket Bot iniciado...');

    // /start TOKEN — vincula o chat_id ao token gerado pelo site
    bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
        const chatId = String(msg.chat.id);
        const token = match?.[1]?.trim();
        const firstName = msg.from?.first_name || 'jogador';
        const username = msg.from?.username || '';

        if (token) {
            const { error } = await supabase
                .from('telegram_sessions')
                .update({ chat_id: chatId, username, first_name: firstName })
                .eq('token', token)
                .gt('expires_at', new Date().toISOString());

            if (!error) {
                await bot.sendMessage(chatId,
                    `✅ *Telegram vinculado com sucesso!*\n\n` +
                    `Olá, ${firstName}! Agora você receberá alertas do *PrideMarket* quando itens da sua watchlist atingirem o preço desejado.\n\n` +
                    `Volte ao site para adicionar itens à sua watchlist:\n${SITE_URL}/watchlist\n\n` +
                    `Use /list para ver seus alertas ativos.`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                console.error('Erro ao vincular sessão:', error);
                await bot.sendMessage(chatId,
                    `⚠️ Link expirado ou inválido. Volte ao site e clique em "Conectar Telegram" novamente.\n${SITE_URL}`
                );
            }
        } else {
            await bot.sendMessage(chatId,
                `👋 Olá, ${firstName}!\n\n` +
                `Eu sou o bot de alertas do *PrideMarket*.\n\n` +
                `Para receber notificações, acesse o site e clique em "Conectar Telegram":\n${SITE_URL}`,
                { parse_mode: 'Markdown' }
            );
        }
    });

    // /list — lista alertas ativos do usuário
    bot.onText(/\/list/, async (msg) => {
        const chatId = String(msg.chat.id);
        const { data: alerts } = await supabase
            .from('price_alerts')
            .select('*')
            .eq('chat_id', chatId)
            .eq('active', true)
            .order('created_at', { ascending: false });

        if (!alerts || alerts.length === 0) {
            await bot.sendMessage(chatId,
                `📋 Você não tem alertas ativos.\n\nAcesse o site para adicionar itens à watchlist:\n${SITE_URL}/watchlist`
            );
            return;
        }

        let msg_text = `📋 *Seus alertas ativos (${alerts.length}):*\n\n`;
        alerts.forEach((a, i) => {
            const min = a.min_price !== null ? `${Number(a.min_price).toLocaleString('pt-BR')}` : '–';
            const max = a.max_price !== null ? `${Number(a.max_price).toLocaleString('pt-BR')}` : '–';
            msg_text += `${i + 1}. *${a.item_name}*\n`;
            msg_text += `   💰 Range: ${min} – ${max} Pride Coin\n`;
            msg_text += `   🆔 ID: \`${a.id.slice(0, 8)}\`\n\n`;
        });
        msg_text += `Use /remove ID para remover um alerta.`;

        await bot.sendMessage(chatId, msg_text, { parse_mode: 'Markdown' });
    });

    // /remove ID — remove alerta pelo ID (parcial)
    bot.onText(/\/remove (.+)/, async (msg, match) => {
        const chatId = String(msg.chat.id);
        const partialId = match?.[1]?.trim() || '';

        const { data: alerts } = await supabase
            .from('price_alerts')
            .select('id, item_name')
            .eq('chat_id', chatId)
            .ilike('id', `${partialId}%`);

        if (!alerts || alerts.length === 0) {
            await bot.sendMessage(chatId, `❌ Alerta não encontrado. Use /list para ver os IDs.`);
            return;
        }

        await supabase
            .from('price_alerts')
            .update({ active: false })
            .eq('id', alerts[0].id);

        await bot.sendMessage(chatId, `✅ Alerta para *${alerts[0].item_name}* removido.`, { parse_mode: 'Markdown' });
    });

    // /stop — desativa todos os alertas
    bot.onText(/\/stop/, async (msg) => {
        const chatId = String(msg.chat.id);
        await supabase
            .from('price_alerts')
            .update({ active: false })
            .eq('chat_id', chatId);

        await bot.sendMessage(chatId, `🔕 Todos os seus alertas foram desativados.`);
    });

    // /help
    bot.onText(/\/help/, async (msg) => {
        await bot.sendMessage(msg.chat.id,
            `🆘 *Ajuda — PrideMarket Bot*\n\n` +
            `📌 *Comandos disponíveis:*\n\n` +
            `/list — Ver alertas ativos\n` +
            `/remove ID — Remover um alerta\n` +
            `/stop — Desativar todos os alertas\n\n` +
            `Para adicionar itens à watchlist, acesse:\n${SITE_URL}/watchlist`,
            { parse_mode: 'Markdown' }
        );
    });

    return bot;
}
