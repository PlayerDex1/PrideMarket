import 'dotenv/config';
import { Client, GatewayIntentBits, Message, Events } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import { SERVERS } from '../config/servers';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || '';
const PRIDE_CHANNEL_ID = process.env.PRIDE_MARKET_CHANNEL_ID || '';
const ZGAMING_CHANNEL_ID = process.env.ZGAMING_MARKET_CHANNEL_ID || '';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mgylypvmgjebvpxhlmly.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RG-4on-iquEBjcvHD-ZAMw_SqZTkHTS';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Map channel ID → server ID for routing
const channelServerMap: Record<string, string> = {};
if (PRIDE_CHANNEL_ID) channelServerMap[PRIDE_CHANNEL_ID] = 'pride';
if (ZGAMING_CHANNEL_ID) channelServerMap[ZGAMING_CHANNEL_ID] = 'zgaming';

function guessIconUrl(itemName: string): string {
  const name = itemName.toLowerCase();
  if (name.includes('talisman of aden')) {
    const match = name.match(/\+(\d+)/);
    const level = match ? Math.min(5, parseInt(match[1])) : 0;
    return `https://l2db.info/icon/etc_talisman_of_aden_i0${level}.png`;
  }
  if (name.includes('cloak')) return 'https://l2db.info/icon/cloak_of_protection_i00.png';
  if (name.includes('talisman of authority')) return 'https://l2db.info/icon/etc_talisman_of_authority_i00.png';
  if (name.includes('dye booster')) return 'https://l2db.info/icon/etc_dye_booster_i00.png';
  return 'https://l2db.info/icon/weapon_the_sword_of_hero_i00.png';
}

function cleanEmojis(text: string): string {
  return text
    .replace(/<:[^:]+:\d+>/g, '')
    .replace(/<\w+\d+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePriceStr(valStr: string, serverId: string): number {
  if (serverId === 'pride') {
    // Pride: "10.000" = 10 PrideCoins (3 decimal places standard)
    const normalized = valStr.replace(/,/g, '.');
    const parts = normalized.split('.');
    if (parts.length > 2) {
      // Multiple dots like 1.000.000 → integer then /1000
      const rawNum = parseInt(normalized.replace(/\./g, ''));
      return rawNum / 1000;
    }
    return parseFloat(normalized);
  } else {
    // ZGaming: "15,000" = 15000 zCoin
    return parseFloat(valStr.replace(/,/g, ''));
  }
}

function parseMessage(msg: Message, serverId: string): { name: string; price: number; currency: string; iconUrl?: string } | null {
  const embed = msg.embeds[0];

  if (embed) {
    console.log(`[${serverId.toUpperCase()} Embed]`, JSON.stringify({
      author: embed.author?.name,
      title: embed.title,
      description: embed.description?.slice(0, 200),
      fields: embed.fields,
      thumbnail: embed.thumbnail?.url,
    }, null, 2));

    // Item name
    let itemName = '';
    if (embed.author?.name) {
      itemName = cleanEmojis(embed.author.name)
        .replace(/\s*was added on the market\.?\s*/gi, '').trim();
    } else if (embed.title) {
      itemName = cleanEmojis(embed.title)
        .replace(/\s*was added on the market\.?\s*/gi, '').trim();
    }

    if (!itemName && embed.fields?.length) {
      const itemField = embed.fields.find(f => /^(item|name|nome|produto|listing)$/i.test(f.name.trim()));
      if (itemField) itemName = cleanEmojis(itemField.value);
    }

    if (!itemName && embed.description) {
      itemName = cleanEmojis(embed.description.split('\n')[0])
        .replace(/\s*was added on the market\.?\s*/gi, '').trim();
    }

    // Price
    let price = 0;
    let currency = serverId === 'pride' ? 'Pride Coin' : 'zCoin';

    // From explicit Price field
    if (embed.fields?.length) {
      const priceField = embed.fields.find(f => /price|preco|valor|cost|amount/i.test(f.name));
      if (priceField) {
        const cleanVal = cleanEmojis(priceField.value);
        const pm = cleanVal.match(/(\d+(?:[,.]\d+)*)/);
        if (pm) {
          price = parsePriceStr(pm[1], serverId);
          if (priceField.value.toLowerCase().includes('adena')) currency = 'Adena';
          else if (priceField.value.toLowerCase().includes('pride')) currency = 'Pride Coin';
          else if (priceField.value.toLowerCase().includes('zcoin')) currency = 'zCoin';
        }
      }
    }

    // From description: "Price: 999.999 Pride Coin"
    if (!price && embed.description) {
      const descMatch = cleanEmojis(embed.description).match(/Price:\s*(\d+(?:[,.]\d+)*)\s*(Pride Coin|zCoin|Adena)/i);
      if (descMatch) {
        price = parsePriceStr(descMatch[1], serverId);
        currency = descMatch[2].trim();
      }
    }

    // Full text fallback
    if (!price) {
      const fullText = cleanEmojis([
        embed.title || '',
        embed.description || '',
        ...(embed.fields || []).map(f => `${f.name} ${f.value}`)
      ].join(' '));
      const pm = fullText.match(/(\d+(?:[,.]\d+)*)/g);
      if (pm) price = parsePriceStr(pm[pm.length - 1], serverId);
    }

    if (itemName && price > 0) {
      const iconUrl = embed.thumbnail?.url || embed.image?.url || embed.author?.iconURL || undefined;
      return { name: itemName, price, currency, iconUrl };
    }
  }

  // Plain text fallback
  const text = msg.content || '';
  if (text) {
    const match = text.match(/^(.+?)\s*[-:–]\s*(\d[\d,.]*)\s*(zcoin|adena|zc|pride|pride coin)/i);
    if (match) {
      return {
        name: match[1].trim(),
        price: parsePriceStr(match[2], serverId),
        currency: match[3].toLowerCase().includes('pride') ? 'Pride Coin' : match[3].toLowerCase() === 'adena' ? 'Adena' : 'zCoin',
      };
    }
  }

  return null;
}

async function processMarketMessage(msg: Message, serverId: string) {
  // We accept both real bots AND webhook integrations (APP type)
  const isBot = msg.author.bot;
  const isWebhook = !!msg.webhookId;
  if (!isBot && !isWebhook) return;

  console.log(`[${serverId.toUpperCase()}] Nova mensagem de: ${msg.author.username} (bot=${isBot}, webhook=${isWebhook})`);

  const parsed = parseMessage(msg, serverId);
  if (!parsed) {
    console.log(`  -> parseMessage falhou. Conteúdo:`, msg.content.slice(0, 100));
    return;
  }

  console.log(`  -> Parse OK: ${parsed.name} | ${parsed.price} ${parsed.currency}`);

  const { error } = await supabase.from('market_items').upsert({
    id: msg.id,
    name: parsed.name,
    price: parsed.price,
    currency: parsed.currency,
    timestamp: msg.createdAt.toISOString(),
    icon_url: parsed.iconUrl || guessIconUrl(parsed.name),
    server_id: serverId,
  }, { onConflict: 'id' });

  if (error && error.code !== '23505') {
    console.error('  -> Supabase error:', error.message);
  } else {
    console.log(`  ✅ Item salvo no Supabase: ${parsed.name} — ${parsed.price} ${parsed.currency}`);
  }
}

export function startMarketPoller() {
  if (!DISCORD_BOT_TOKEN) {
    console.warn('⚠️  DISCORD_BOT_TOKEN não definido. Bot desativado.');
    return;
  }

  if (!PRIDE_CHANNEL_ID && !ZGAMING_CHANNEL_ID) {
    console.warn('⚠️  Nenhum channel ID configurado (PRIDE_MARKET_CHANNEL_ID, ZGAMING_MARKET_CHANNEL_ID). Bot desativado.');
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`✅ Bot conectado como: ${c.user.tag}`);
    console.log(`👀 Monitorando canais: ${Object.keys(channelServerMap).join(', ')}`);
  });

  client.on(Events.MessageCreate, async (message) => {
    const serverId = channelServerMap[message.channelId];
    if (!serverId) return; // mensagem de outro canal, ignora

    await processMarketMessage(message, serverId);
  });

  client.login(DISCORD_BOT_TOKEN).catch(err => {
    console.error('❌ Discord bot login failed:', err.message);
  });
}

// Auto-start when run directly (Railway)
startMarketPoller();
