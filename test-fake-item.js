import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgylypvmgjebvpxhlmly.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RG-4on-iquEBjcvHD-ZAMw_SqZTkHTS';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createFakeMarketItem() {
    console.log('🚀 Criando um Item Fake de Teste no Supabase...');

    // Gerando um ID aleatório gigante igual o Discord faz
    const fakeDiscordId = '99999' + Math.floor(Math.random() * 10000000000000);

    const { error } = await supabase.from('market_items').upsert({
        id: fakeDiscordId,
        name: '✨ Espada de Teste do PrideMarket ✨',
        price: 99.999, // Vai aparecer 99.999 no site
        currency: 'Pride Coin',
        icon_url: 'https://l2db.info/icon/weapon_the_sword_of_hero_i00.png',
        server_id: 'pride',
        timestamp: new Date().toISOString()
    });

    if (error) {
        console.error('❌ Erro ao criar item fake:', error.message);
    } else {
        console.log('✅ ITEM FAKE CRIADO COM SUCESSO!');
        console.log('👉 Abra o seu site agora (market.prideessence.club) ou rode npm run dev');
        console.log('👉 Você deve ver a "✨ Espada de Teste do PrideMarket ✨" no topo da lista custando 99.999 PC!');
    }
}

createFakeMarketItem();
