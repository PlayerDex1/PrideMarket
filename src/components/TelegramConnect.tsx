import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, CheckCircle, Loader } from 'lucide-react';

interface Props {
    onConnected: (chatId: string, username: string) => void;
}

export default function TelegramConnect({ onConnected }: Props) {
    const [status, setStatus] = useState<'idle' | 'waiting' | 'connected'>('idle');
    const [token, setToken] = useState('');
    const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'pridemarketbot';
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleConnect = async () => {
        // Gera token único
        const newToken = crypto.randomUUID();
        setToken(newToken);
        setStatus('waiting');

        // Salva sessão no Supabase
        await supabase.from('telegram_sessions').insert({
            token: newToken,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

        // Abre o bot no Telegram
        window.open(`https://t.me/${BOT_USERNAME}?start=${newToken}`, '_blank');

        // Polling para detectar vínculo
        pollRef.current = setInterval(async () => {
            const { data } = await supabase
                .from('telegram_sessions')
                .select('chat_id, username, first_name')
                .eq('token', newToken)
                .not('chat_id', 'is', null)
                .single();

            if (data?.chat_id) {
                clearInterval(pollRef.current!);
                setStatus('connected');
                localStorage.setItem('tg_chat_id', data.chat_id);
                localStorage.setItem('tg_username', data.username || data.first_name || '');
                onConnected(data.chat_id, data.username || data.first_name || '');
            }
        }, 3000);
    };

    // Limpa o polling ao desmontar
    useEffect(() => () => {
        if (pollRef.current) clearInterval(pollRef.current);
    }, []);

    if (status === 'connected') {
        return (
            <div className="telegram-connect connected">
                <CheckCircle size={20} />
                <span>Telegram conectado!</span>
            </div>
        );
    }

    return (
        <div className="telegram-connect">
            {status === 'idle' ? (
                <>
                    <p className="tg-desc">
                        Para receber alertas, conecte seu Telegram:
                    </p>
                    <button className="btn-telegram" onClick={handleConnect}>
                        <Send size={16} />
                        Conectar Telegram
                    </button>
                </>
            ) : (
                <div className="tg-waiting">
                    <Loader size={18} className="spin" />
                    <div>
                        <p><strong>Aguardando vinculação...</strong></p>
                        <p className="tg-desc">Clique em <strong>Start</strong> no Telegram para vincular sua conta.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
