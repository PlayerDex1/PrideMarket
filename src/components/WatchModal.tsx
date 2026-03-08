import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import TelegramConnect from './TelegramConnect';
import { Bell, X } from 'lucide-react';

interface Props {
    itemName: string;
    onClose: () => void;
}

export default function WatchModal({ itemName, onClose }: Props) {
    const [chatId, setChatId] = useState('');
    const [username, setUsername] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const storedChatId = localStorage.getItem('tg_chat_id') || '';
        const storedUsername = localStorage.getItem('tg_username') || '';
        setChatId(storedChatId);
        setUsername(storedUsername);
    }, []);

    const handleSave = async () => {
        if (!chatId) return;
        setSaving(true);

        const { error } = await supabase.from('price_alerts').insert({
            chat_id: chatId,
            item_name: itemName,
            min_price: minPrice ? parseFloat(minPrice) : null,
            max_price: maxPrice ? parseFloat(maxPrice) : null,
            active: true,
        });

        setSaving(false);
        if (!error) setSaved(true);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box watch-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3><Bell size={18} /> Watch: {itemName}</h3>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    {!chatId ? (
                        <TelegramConnect onConnected={(id, uname) => { setChatId(id); setUsername(uname); }} />
                    ) : (
                        <>
                            {saved ? (
                                <div className="watch-saved">
                                    ✅ Alerta criado! Você será notificado no Telegram quando <strong>{itemName}</strong> entrar no range definido.
                                </div>
                            ) : (
                                <>
                                    <p className="watch-telegram-info">
                                        Conectado como <strong>@{username || chatId}</strong>
                                    </p>

                                    <div className="watch-range">
                                        <div className="watch-field">
                                            <label>Preço mínimo (opcional)</label>
                                            <div className="input-with-unit">
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={minPrice}
                                                    onChange={e => setMinPrice(e.target.value)}
                                                />
                                                <span>Pride Coin</span>
                                            </div>
                                        </div>
                                        <div className="watch-field">
                                            <label>Preço máximo (opcional)</label>
                                            <div className="input-with-unit">
                                                <input
                                                    type="number"
                                                    placeholder="∞"
                                                    value={maxPrice}
                                                    onChange={e => setMaxPrice(e.target.value)}
                                                />
                                                <span>Pride Coin</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="watch-hint">
                                        Você receberá uma notificação no Telegram quando <strong>{itemName}</strong> aparecer no range definido.
                                    </p>

                                    <button
                                        className="btn-save-alert"
                                        onClick={handleSave}
                                        disabled={saving}
                                    >
                                        {saving ? 'Salvando...' : '🔔 Criar Alerta'}
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
