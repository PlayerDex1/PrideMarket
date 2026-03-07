import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const TARGET_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

client.on('ready', () => {
    console.log(`🤖 Bot logado como ${client.user.tag}!`);
    console.log(`📡 Escutando atentamente o canal: ${TARGET_CHANNEL_ID}`);
});

client.on('messageCreate', async (message) => {
    // Ignora mensagens de outros canais ou de bots
    if (message.channelId !== TARGET_CHANNEL_ID || message.author.bot) return;

    const content = message.content;
    console.log(`\n📩 Nova mensagem de ${message.author.username}: "${content}"`);

    // Quebra a mensagem por linhas caso o usuário venda vários itens num post só
    const lines = content.split('\n');

    for (const line of lines) {
        // Regex Inteligente: Remove lixo do início e isola o "nome" e o "preço / moeda"
        // Exemplo: "WTS [1 pcs] Arcana Mace - 50 PC" vira "name: [1 pcs] Arcana Mace", "price: 50", "currency: PC"
        const match = line.match(/(?:wts|sell|vende|vendo|\[sell\]|>)?\s*(.*?)\s*(?:-|por|for|:|>)?\s*(\d+(?:\.\d+)?(?:k|m|b|kk)?)\s*(pc|pride coin|coin)?$/i);

        if (match && match[1] && match[2]) {
            let itemName = match[1].replace(/^(?:wts|sell|vende)\s+/i, '').trim();
            let rawPrice = match[2].toLowerCase();
            let currency = (match[3] || 'PC').toUpperCase();

            if (currency === 'PRIDE COIN' || currency === 'COIN') currency = 'PC';
            if (itemName.length < 2) continue; // Ignore linhas curtas como "Up"

            // Conversão de grandezas de Lineage
            let price = parseFloat(rawPrice.replace(/[kmb]/g, ''));
            if (rawPrice.includes('k')) price *= 1000;
            if (rawPrice.includes('kk') || rawPrice.includes('m')) price *= 1000000;
            if (rawPrice.includes('b')) price *= 1000000000;

            console.log(`🔍 Item Lido: [${itemName}] | Preço: ${price} ${currency}`);

            // Envia para o Banco de Dados do PrideMarket (Supabase)
            const { error, data } = await supabase
                .from('market_items')
                .insert([{
                    name: itemName,
                    price: price,
                    currency: currency,
                    timestamp: new Date().toISOString(),
                    server_id: 'pride',
                    icon_url: '' // Opcional, o frontend lida com fallback
                }]);

            if (error) {
                console.error('❌ Erro no Supabase:', error.message);
            } else {
                console.log('✅ Inserido no MarketOnline com Sucesso!');
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
