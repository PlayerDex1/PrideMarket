import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SERVERS } from '../config/servers';
import { initBot } from './telegramBot';
import { runAlertChecker } from './alertChecker';

const USER_TOKEN = process.env.DISCORD_USER_TOKEN || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';

// Service Key bypassa RLS — obrigatório para INSERT funcionar
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_KEY são obrigatórios. Configure as variáveis de ambiente no Railway.');
  process.exit(1);
}

if (process.env.SUPABASE_SERVICE_KEY) {
  console.log('🔑 Supabase: usando Service Key (RLS bypass ativo)');
} else {
  console.log('⚠️  Supabase: usando Anon Key — configure SUPABASE_SERVICE_KEY no Railway');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Tabela dedicada ao Pride Market
const TABLE = 'pride_market_items';

const POLL_INTERVAL_MS = 5000; // 5 seconds

// Armazena o state do ultimo ID lido por servidor
let lastMessageIds: Record<string, string | null> = {};

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

// Remove Discord custom emojis like <:zcoin:1234> or <zcoin1234>
function cleanEmojis(text: string): string {
  return text
    .replace(/<:[^:]+:\d+>/g, '')
    .replace(/<\w+\d+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse price and name from Discord message (embed or plain text)
function parseMessage(msg: any, serverId: string): { name: string; price: number; currency: string; iconUrl?: string } | null {
  // Helper para converter string de preco dependendo do servidor
  const parsePriceStr = (valStr: string, sId: string) => {
    // Pride: "10.000" significa 10 PrideCoins (3 casas decimais)
    if (sId === 'pride') {
      const normalized = valStr.replace(/,/g, '.');
      const parts = normalized.split('.');
      if (parts.length > 2) {
        const rawNum = parseInt(normalized.replace(/\./g, ''));
        return rawNum / 1000;
      }
      return parseFloat(normalized);
    } else {
      // ZGaming: remove todas as virgulas de milhares
      return parseFloat(valStr.replace(/,/g, ''));
    }
  };

  if (msg.embeds && msg.embeds.length > 0) {
    const embed = msg.embeds[0];

    // Log embed structure
    console.log('[Embed]', JSON.stringify({
      author: embed.author,
      title: embed.title,
      description: embed.description?.slice(0, 150),
      thumbnail: embed.thumbnail,
      image: embed.image,
      fields: embed.fields,
    }, null, 2));

    // 1. Item name: author.name > title > field > description
    let itemName = '';
    if (embed.author?.name) {
      itemName = cleanEmojis(embed.author.name)
        .replace(/\s*was added on the market\.?\s*/gi, '')
        .trim();
    } else if (embed.title) {
      itemName = cleanEmojis(embed.title)
        .replace(/\s*was added on the market\.?\s*/gi, '')
        .trim();
    }

    // 2. Item name from specific field
    if (!itemName && embed.fields) {
      const itemField = embed.fields.find((f: any) =>
        /^(item|name|nome|produto|listing)$/i.test(f.name.trim())
      );
      if (itemField) itemName = cleanEmojis(itemField.value);
    }

    // 3. Item name from first line of description
    if (!itemName && embed.description) {
      itemName = cleanEmojis(embed.description.split('\n')[0])
        .replace(/\s*was added on the market\.?\s*/gi, '')
        .trim();
    }

    // 4. Price from "Price" field
    let price = 0;
    let currency = serverId === 'pride' ? 'Pride Coin' : 'zCoin';
    if (embed.fields) {
      const priceField = embed.fields.find((f: any) =>
        /price|preco|valor|cost|amount/i.test(f.name)
      );
      if (priceField) {
        const cleanVal = cleanEmojis(priceField.value);
        const pm = cleanVal.match(/(\d+(?:[,.]\d+)*)/);
        if (pm) {
          price = parsePriceStr(pm[1], serverId);
          if (priceField.value.toLowerCase().includes('adena')) currency = 'Adena';
          else if (priceField.value.toLowerCase().includes('pride')) currency = 'Pride Coin';
        }
      }
    }

    // 5. Price from description text (Pride Format: "Price: 999.999 Pride Coin")
    if (!price && embed.description) {
      const descMatch = cleanEmojis(embed.description).match(/Price:\s*(\d+(?:[,.]\d+)*)\s*(Pride Coin|zCoin|Adena)/i);
      if (descMatch) {
        price = parsePriceStr(descMatch[1], serverId);
        currency = descMatch[2].trim();
      }
    }

    // 6. Price from full text fallback
    if (!price) {
      const fullText = cleanEmojis([
        embed.title || '',
        embed.description || '',
        ...(embed.fields || []).map((f: any) => `${f.name} ${f.value}`)
      ].join(' '));
      const pm = fullText.match(/(\d+(?:[,.]\d+)*)/g);
      if (pm) price = parsePriceStr(pm[pm.length - 1], serverId);
    }

    if (itemName && price > 0) {
      const iconUrl = embed.thumbnail?.url || embed.thumbnail?.proxy_url
        || embed.image?.url || embed.author?.icon_url || undefined;
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
    const pm = text.match(/(\d+(?:[,.]\d+)*)\s*(zcoin|adena|zc|pride|pride coin)/i);
    if (pm) {
      const namePart = cleanEmojis(text.split(pm[0])[0]).replace(/[-:,]$/, '').trim();
      if (namePart) {
        return {
          name: namePart,
          price: parsePriceStr(pm[1], serverId),
          currency: pm[2].toLowerCase().includes('pride') ? 'Pride Coin' : pm[2].toLowerCase() === 'adena' ? 'Adena' : 'zCoin',
        };
      }
    }
  }

  return null;
}

async function pollMessagesForServer(server: { id: string, channelId: string, name: string }) {
  if (!USER_TOKEN) return;

  const lastId = lastMessageIds[server.id];
  const url = `https://discord.com/api/v10/channels/${server.channelId}/messages?limit=20${lastId ? `&after=${lastId}` : ''}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: USER_TOKEN, // user token (no "Bot " prefix)
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.error('❌ L2 Poller: Invalid user token (401). Check DISCORD_USER_TOKEN in .env');
      } else if (res.status === 403) {
        console.error(`❌ L2 Poller: No access to channel (403). Cannot access ${server.name} channel.`);
      } else {
        console.error(`❌ L2 Poller: Discord API error ${res.status} on ${server.name}`);
      }
      return;
    }

    const messages: any[] = await res.json();

    if (!Array.isArray(messages) || messages.length === 0) return;

    // Discord returns newest first — reverse to process oldest first
    const sorted = [...messages].reverse();

    // Update lastMessageId to the newest message
    lastMessageIds[server.id] = messages[0].id;

    let newCount = 0;
    for (const msg of sorted) {
      // Only process bot messages or webhook (APP) messages
      if (!msg.author?.bot && !msg.webhook_id) continue;

      const parsed = parseMessage(msg, server.id);
      if (!parsed) continue;

      // Limpa o nome do item antes de salvar
      const cleanName = parsed.name
        .replace(/\s*was added on the market\.?\s*/gi, '')
        .trim();

      const { error } = await supabase.from(TABLE).upsert({
        id: msg.id,
        name: cleanName,
        price: parsed.price,
        currency: parsed.currency,
        timestamp: msg.timestamp,
        icon_url: parsed.iconUrl || guessIconUrl(cleanName),
      }, { onConflict: 'id' });

      if (!error) {
        console.log(`📦 Market item [${server.name}]: ${parsed.name} — ${parsed.price} ${parsed.currency}`);
        newCount++;
      } else if (error.code !== '23505') {
        console.error('Supabase error:', error.message);
      }
    }

    if (newCount > 0) {
      console.log(`✅ L2 Poller: ${newCount} new item(s) captured from ${server.name}`);
    }

  } catch (err: any) {
    console.error(`❌ L2 Poller fetch error on ${server.name}:`, err.message);
  }
}

async function pollAll() {
  const prideChannelId = process.env.PRIDE_MARKET_CHANNEL_ID;
  const zgamingChannelId = process.env.ZGAMING_MARKET_CHANNEL_ID;

  const targets = [];
  if (prideChannelId) targets.push({ id: 'pride', name: 'Pride', channelId: prideChannelId });
  if (zgamingChannelId) targets.push({ id: 'zgaming', name: 'ZGaming', channelId: zgamingChannelId });

  for (const t of targets) {
    await pollMessagesForServer(t);
  }
}

export function startMarketPoller() {
  if (!USER_TOKEN) {
    console.warn('⚠️  DISCORD_USER_TOKEN não definido. L2 Market Poller desativado.');
    return;
  }

  const channels = [
    process.env.PRIDE_MARKET_CHANNEL_ID ? 'PRIDE' : null,
    process.env.ZGAMING_MARKET_CHANNEL_ID ? 'ZGAMING' : null,
  ].filter(Boolean);

  if (channels.length === 0) {
    console.warn('⚠️  Nenhum canal configurado. Defina PRIDE_MARKET_CHANNEL_ID no Railway.');
    return;
  }

  console.log(`🔄 L2 Market Poller ativo (a cada ${POLL_INTERVAL_MS / 1000}s) — Monitorando: ${channels.join(' & ')}`);

  pollAll();
  setInterval(pollAll, POLL_INTERVAL_MS);
}

// Inicia o bot Telegram e alertChecker (se token configurado)
const tgBot = initBot();
if (tgBot) {
  runAlertChecker(tgBot).catch(console.error);
  console.log('🤖 Telegram Bot + AlertChecker ativos');
} else {
  console.log('⚠️  TELEGRAM_BOT_TOKEN não configurado — alertas Telegram desativados');
}

// Auto-start no Railway
startMarketPoller();
