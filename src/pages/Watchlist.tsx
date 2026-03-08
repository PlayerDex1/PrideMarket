import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import TelegramConnect from '../components/TelegramConnect';
import { Bell, BellOff, Trash2, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../lib/format';

interface Alert {
    id: string;
    item_name: string;
    min_price: number | null;
    max_price: number | null;
    active: boolean;
    notified_at: string | null;
    created_at: string;
}

export default function Watchlist() {
    const [chatId, setChatId] = useState('');
    const [username, setUsername] = useState('');
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('tg_chat_id') || '';
        const storedUser = localStorage.getItem('tg_username') || '';
        setChatId(stored);
        setUsername(storedUser);
        if (stored) loadAlerts(stored);
    }, []);

    const loadAlerts = async (id: string) => {
        setLoading(true);
        const { data } = await supabase
            .from('price_alerts')
            .select('*')
            .eq('chat_id', id)
            .order('created_at', { ascending: false });
        setAlerts(data || []);
        setLoading(false);
    };

    const toggleAlert = async (alert: Alert) => {
        await supabase
            .from('price_alerts')
            .update({ active: !alert.active })
            .eq('id', alert.id);
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, active: !a.active } : a));
    };

    const removeAlert = async (id: string) => {
        await supabase.from('price_alerts').delete().eq('id', id);
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const disconnect = () => {
        localStorage.removeItem('tg_chat_id');
        localStorage.removeItem('tg_username');
        setChatId('');
        setAlerts([]);
    };

    return (
        <div className="watchlist-page">
            <div className="watchlist-header">
                <h1><Bell size={22} /> Watchlist</h1>
                {chatId && (
                    <div className="watchlist-tg-info">
                        <span>✅ @{username || chatId}</span>
                        <button className="btn-disconnect" onClick={disconnect}>Desconectar</button>
                    </div>
                )}
            </div>

            {!chatId ? (
                <div className="watchlist-empty">
                    <Bell size={48} opacity={0.3} />
                    <h2>Conecte seu Telegram</h2>
                    <p>Para monitorar itens e receber alertas de preço, conecte seu Telegram primeiro.</p>
                    <TelegramConnect onConnected={(id, uname) => {
                        setChatId(id);
                        setUsername(uname);
                        loadAlerts(id);
                    }} />
                </div>
            ) : (
                <>
                    <div className="watchlist-toolbar">
                        <span>{alerts.length} alerta{alerts.length !== 1 ? 's' : ''}</span>
                        <button className="btn-refresh" onClick={() => loadAlerts(chatId)}>
                            <RefreshCw size={14} /> Atualizar
                        </button>
                    </div>

                    {loading ? (
                        <div className="watchlist-loading">Carregando alertas...</div>
                    ) : alerts.length === 0 ? (
                        <div className="watchlist-empty">
                            <Bell size={48} opacity={0.3} />
                            <p>Nenhum alerta na sua watchlist.</p>
                            <p>Clique no botão <strong>👁 Watch</strong> em qualquer item para começar.</p>
                        </div>
                    ) : (
                        <div className="alerts-list">
                            {alerts.map(alert => (
                                <div key={alert.id} className={`alert-card ${!alert.active ? 'inactive' : ''}`}>
                                    <div className="alert-info">
                                        <span className="alert-name">{alert.item_name}</span>
                                        <div className="alert-range">
                                            <span>Range:</span>
                                            <strong>
                                                {alert.min_price !== null ? formatCurrency(alert.min_price) : '–'}
                                                {' '}&ndash;{' '}
                                                {alert.max_price !== null ? formatCurrency(alert.max_price) : '∞'}
                                            </strong>
                                            <span>Pride Coin</span>
                                        </div>
                                        {alert.notified_at && (
                                            <span className="alert-last">
                                                Último alerta: {new Date(alert.notified_at).toLocaleDateString('pt-BR')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="alert-actions">
                                        <button
                                            className={`btn-toggle ${alert.active ? 'active' : ''}`}
                                            onClick={() => toggleAlert(alert)}
                                            title={alert.active ? 'Pausar alerta' : 'Ativar alerta'}
                                        >
                                            {alert.active ? <Bell size={16} /> : <BellOff size={16} />}
                                        </button>
                                        <button
                                            className="btn-remove"
                                            onClick={() => removeAlert(alert.id)}
                                            title="Remover alerta"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
