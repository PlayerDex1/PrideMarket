import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgylypvmgjebvpxhlmly.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RG-4on-iquEBjcvHD-ZAMw_SqZTkHTS';

// NOTA: Precisamos da SERVICE_ROLE KEY para atualizar dados velhos de forma global sem restrições.
// Como só temos a ANON_KEY no projeto, não é recomendado (ou possível) rodar um UPDATE sem a key correta administrativa via API pública (Rls vai bloquear se não for o Admin).
// Por esse motivo, vamos gerar a instrução SQL exata pro usuário colar no painel dele, que é 100% mais seguro.
