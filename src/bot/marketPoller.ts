import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SERVERS } from '../config/servers';

// Suporte a DISCORD_USER_TOKEN (conta pessoal) ou DISCORD_BOT_TOKEN (bot oficial)
// IMPORTANTE: User tokens NAO usam prefixo "Bot " - apenas bots oficiais usam
const USER_TOKEN = process.env.DISCORD_USER_TOKEN || process.env.DISCORD_BOT_TOKEN || '';
const AUTH_HEADER = USER_TOKEN; // Sem nenhum prefixo para user tokens

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mgylypvmgjebvpxhlmly.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RG-4on-iquEBjcvHD-ZAMw_SqZTkHTS';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const POLL_INTERVAL_MS = 5000; // 5 seconds

// Armazena o ultimo ID lido por servidor
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

function cleanEmojis(text: string): string {
  return text
    .replace(/<:[^:]+:\d+>/g, '')
    .replace(/<\w+\d+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePriceStr(valStr: string, serverId: string): number {
  if (serverId === 'pride') {
    // Pride: "10.000" significa 10 PrideCoins (3 casas decimais fixas)
    const normalized = valStr.replace(/,/g, '.');
    const parts = normalized.split('.');
    if (parts.length > 2) {
      // 1.000.000 → divide por 1000
      const rawNum = parseInt(normalized.replace(/\./g, ''));
      return rawNum / 1000;
    }
    return parseFloat(normalized);
  } else {
    // ZGaming: "15,000" significa 15000 zCoin
    return parseFloat(valStr.replace(/,/g, ''));
  }
}

function parseMessage(msg: any, serverId: string): { name: string; price: number; currency: string; iconUrl?: string } | null {
  if (msg.embeds && msg.embeds.length > 0) {
    const embed = msg.embeds[0];

    console.log(`[${serverId.toUpperCase()} Embed]`, JSON.stringify({
      author: embed.author?.name,
      title: embed.title,
      description: embed.description?.slice(0, 200),
      fields: embed.fields,
      thumbnail: embed.thumbnail?.url,
    }, null, 2));

    // 1. Item name: author.name > title > field > description
    let itemName = '';
    if (embed.author?.name) {
      itemName = cleanEmojis(embed.author.name)
        .replace(/\s*was added on the market\.?\s*/gi, '').trim();
    } else if (embed.title) {
      itemName = cleanEmojis(embed.title)
        .replace(/\s*was added on the market\.?\s*/gi, '').trim();
    }

    if (!itemName && embed.fields) {
      const itemField = embed.fields.find((f: any) =>
        /^(item|name|nome|produto|listing)$/i.test(f.name.trim())
      );
      if (itemField) itemName = cleanEmojis(itemField.value);
    }

    if (!itemName && embed.description) {
      itemName = cleanEmojis(embed.description.split('\n')[0])
        .replace(/\s*was added on the market\.?\s*/gi, '').trim();
    }

    // Price
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
          else if (priceField.value.toLowerCase().includes('zcoin')) currency = 'zCoin';
        }
      }
    }

    // Price from description: "Price: 999.999 Pride Coin"
    if (!price && embed.description) {
      const descMatch = cleanEmojis(embed.description).match(/Price:\s*(\d+(?:[,.]\d+)*)\s*(Pride Coin|zCoin|Adena)/i);
      if (descMatch) {
        price = parsePriceStr(descMatch[1], serverId);
        currency = descMatch[2].trim();
      }
    }

    // Fallback: any number in the embed
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
  }

  return null;
}

async function pollMessagesForServer(server: { id: string, channelId: string, name: string }) {
  if (!AUTH_HEADER) return;

  const lastId = lastMessageIds[server.id];
  const url = `https://discord.com/api/v10/channels/${server.channelId}/messages?limit=20${lastId ? `&after=${lastId}` : ''}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: AUTH_HEADER,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9030 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.error(`❌ L2 Poller [${server.name}]: Token inválido (401). Verifique DISCORD_USER_TOKEN no Railway.`);
      } else if (res.status === 403) {
        console.error(`❌ L2 Poller [${server.name}]: Sem acesso ao canal (403). A conta não tem permissão de leitura no canal.`);
      } else if (res.status === 429) {
        console.warn(`⚠️ L2 Poller [${server.name}]: Rate limited (429). Aguardando...`);
      } else {
        console.error(`❌ L2 Poller [${server.name}]: Erro API Discord ${res.status}`);
      }
      return;
    }

    const messages: any[] = await res.json();
    if (!Array.isArray(messages) || messages.length === 0) return;

    // Discord retorna do mais recente pro mais antigo — invertemos
    const sorted = [...messages].reverse();
    lastMessageIds[server.id] = messages[0].id;

    let newCount = 0;
    for (const msg of sorted) {
      // Aceita bots E webhooks (ex: Pride Marketplace APP)
      const isBot = msg.author?.bot;
      const isWebhook = !!msg.webhook_id;

      if (!isBot && !isWebhook) {
        console.log(`[${server.name}] Ignorando mensagem de usuario normal: ${msg.author?.username}`);
        continue;
      }

      console.log(`[${server.name}] Processando: ${msg.author?.username} (bot=${isBot}, webhook=${isWebhook})`);

      const parsed = parseMessage(msg, server.id);
      if (!parsed) {
        console.log(`  -> Parse falhou. content: ${msg.content?.slice(0, 80)}`);
        continue;
      }

      console.log(`  -> Parse OK: ${parsed.name} | ${parsed.price} ${parsed.currency}`);

      const { error } = await supabase.from('market_items').upsert({
        id: msg.id,
        name: parsed.name,
        price: parsed.price,
        currency: parsed.currency,
        timestamp: msg.timestamp,
        icon_url: parsed.iconUrl || guessIconUrl(parsed.name),
        server_id: server.id,
      }, { onConflict: 'id' });

      if (!error) {
        console.log(`  ✅ Salvo: ${parsed.name} — ${parsed.price} ${parsed.currency}`);
        newCount++;
      } else if (error.code !== '23505') {
        console.error('  Supabase error:', error.message);
      }
    }

    if (newCount > 0) {
      console.log(`✅ [${server.name}] ${newCount} novo(s) item(ns) capturado(s)!`);
    }

  } catch (err: any) {
    console.error(`❌ Fetch error [${server.name}]:`, err.message);
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
  if (!AUTH_HEADER) {
    console.warn('⚠️  DISCORD_USER_TOKEN (ou DISCORD_BOT_TOKEN) não definido. Poller desativado.');
    return;
  }

  const channels = [
    process.env.PRIDE_MARKET_CHANNEL_ID ? 'PRIDE' : null,
    process.env.ZGAMING_MARKET_CHANNEL_ID ? 'ZGAMING' : null,
  ].filter(Boolean);

  if (channels.length === 0) {
    console.warn('⚠️  Nenhum channel ID configurado. Defina PRIDE_MARKET_CHANNEL_ID no Railway.');
    return;
  }

  console.log(`🔄 L2 Market Poller ativo (a cada ${POLL_INTERVAL_MS / 1000}s) — Monitorando: ${channels.join(' & ')}`);

  // Primeira poll imediata, depois a cada 5s
  pollAll();
  setInterval(pollAll, POLL_INTERVAL_MS);
}

// Auto-start no Railway
startMarketPoller();
