import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgylypvmgjebvpxhlmly.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RG-4on-iquEBjcvHD-ZAMw_SqZTkHTS';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkLatestItems() {
    console.log('🔍 Buscando os 10 itens mais recentes no Supabase (PRIDE)...');
    const { data, error } = await supabase
        .from('market_items')
        .select('*')
        .eq('server_id', 'pride')
        .order('timestamp', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Erro ao consultar Supabase:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ Nenhum item encontrado na tabela market_items.');
        return;
    }

    console.table(data.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        currency: item.currency,
        server_id: item.server_id,
        timestamp: item.timestamp
    })));
}

checkLatestItems();
