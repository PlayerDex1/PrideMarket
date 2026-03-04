import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, TrendingDown, TrendingUp, BarChart2, Sword } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/format';

const CURRENCY = 'Pride Coin';

interface HistoryItem {
    id: string;
    name: string;
    price: number;
    currency: string;
    timestamp: string;
    iconUrl: string;
}

function extractQuantity(name: string) {
    const match = name.match(/\[\s*(\d+)\s*pcs\.?\]/i) || name.match(/\bx\s*(\d+)\b/i) || name.match(/\b(\d+)\s*x\b/i);
    return match ? parseInt(match[1], 10) : 1;
}

function cleanItemName(name: string) {
    return name.replace(/\s*was added on the market\s*/i, '').trim();
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#0d0d14', border: '1px solid #2a2a40', borderRadius: 10,
            padding: '10px 14px', fontSize: 12,
        }}>
            <p style={{ color: '#8888aa', margin: '0 0 5px', fontSize: 11 }}>{label}</p>
            <p style={{ color: '#f4a261', margin: 0, fontWeight: 700, fontSize: 14 }}>
                {formatCurrency(Number(payload[0].value), payload[0].payload.currency || CURRENCY)}
                <span style={{ color: '#4a4a66', fontWeight: 400, fontSize: 10, marginLeft: 4 }}>{payload[0].payload.currency || CURRENCY}</span>
            </p>
        </div>
    );
};

export default function ItemDetail() {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        if (!name) return;
        const { data } = await supabase
            .from('market_items')
            .select('*')
            .eq('server_id', 'pride')
            .ilike('name', `%${name}%`)
            .order('timestamp', { ascending: true })
            .limit(100);
        if (data) {
            setHistory(data.map((d: any) => ({
                id: d.id, name: d.name, price: d.price, currency: d.currency,
                timestamp: d.timestamp, iconUrl: d.icon_url || '',
            })));
        }
        setLoading(false);
    }, [name]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const formatTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const formatTimeShort = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const prices = history.map(h => h.price);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const lastPrice = prices.length ? prices[prices.length - 1] : 0;
    const priceChange = prices.length > 1 ? ((lastPrice - prices[0]) / prices[0]) * 100 : 0;

    const chartData = history.map(h => ({ time: formatTimeShort(h.timestamp), price: h.price, name: h.name, currency: h.currency }));
    const firstIcon = history.find(h => h.iconUrl)?.iconUrl || '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="animate-fade-in">

            {/* Back button */}
            <button
                onClick={() => navigate(-1)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '6px 0', fontFamily: 'var(--font-sans)',
                    width: 'fit-content', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
            >
                <ArrowLeft size={14} /> Voltar ao mercado
            </button>

            {/* Item header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 18, padding: 24,
                background: 'linear-gradient(135deg, rgba(12,12,20,0.9) 0%, rgba(18,12,20,0.95) 100%)',
                border: '1px solid var(--border)', borderRadius: 18,
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Background glow */}
                <div style={{
                    position: 'absolute', top: -40, right: -40, width: 200, height: 200,
                    background: 'radial-gradient(circle, rgba(230,57,70,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* Icon */}
                <div style={{
                    width: 72, height: 72, borderRadius: 16, flexShrink: 0,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                    {firstIcon ? (
                        <img src={firstIcon} alt={name} style={{ width: 58, height: 58, objectFit: 'contain' }}
                            onError={e => { (e.target as HTMLImageElement).src = 'https://l2db.info/icon/weapon_the_sword_of_hero_i00.png'; }} />
                    ) : <Sword size={28} color="var(--text-muted)" />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {cleanItemName(name)}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {history.length} listagem(ns)
                        </span>
                        {!loading && prices.length > 1 && (
                            <span style={{
                                fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                                background: priceChange >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(230,57,70,0.1)',
                                color: priceChange >= 0 ? '#22c55e' : '#e63946',
                                border: `1px solid ${priceChange >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(230,57,70,0.25)'}`,
                            }}>
                                {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Current price */}
                {lastPrice > 0 && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Último preço</p>
                        <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--gold)', letterSpacing: '-0.5px' }}>
                            {formatCurrency(lastPrice, history[history.length - 1]?.currency || CURRENCY)}
                        </p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>{CURRENCY}</p>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                    { label: 'Preço mínimo', value: minPrice, icon: TrendingDown, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
                    { label: 'Preço máximo', value: maxPrice, icon: TrendingUp, color: '#e63946', bg: 'rgba(230,57,70,0.08)' },
                    { label: 'Preço médio', value: avgPrice, icon: BarChart2, color: '#f4a261', bg: 'rgba(244,162,97,0.08)' },
                    { label: 'Total listado', value: null, icon: Clock, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', raw: `${history.length}x` } as const,
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                            <s.icon size={15} color={s.color} />
                        </div>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>{s.label}</p>
                        <p style={{ margin: '5px 0 0', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                            {s.raw ?? `${formatCurrency(s.value!, history[0]?.currency || CURRENCY)} ${history[0]?.currency || CURRENCY}`}
                        </p>
                    </div>
                ))}
            </div>

            {/* Price chart */}
            <div className="glass-card" style={{ padding: 22 }}>
                <h2 style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart2 size={15} color="#e63946" /> Histórico de Preços
                </h2>
                {loading ? (
                    <div className="shimmer" style={{ height: 200, borderRadius: 10 }} />
                ) : chartData.length < 2 ? (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        Dados insuficientes para o gráfico.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#e63946" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#e63946" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2a" />
                            <XAxis dataKey="time" tick={{ fill: '#4a4a66', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fill: '#4a4a66', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={avgPrice} stroke="#f4a261" strokeDasharray="4 4" strokeOpacity={0.4} />
                            <Line
                                type="monotone" dataKey="price" stroke="#e63946" strokeWidth={2.5}
                                dot={{ fill: '#e63946', r: 3, strokeWidth: 0 }}
                                activeDot={{ r: 5, fill: '#f87171', strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* History table */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Histórico de Listagens</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Item', 'Preço', 'Data/Hora'].map(col => (
                                    <th key={col} style={{
                                        padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                                        letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)',
                                        background: 'var(--bg-elevated)',
                                    }}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...history].reverse().map(item => (
                                <tr key={item.id}
                                    className="table-row-hover"
                                    style={{ borderBottom: '1px solid rgba(30,30,48,0.5)' }}
                                >
                                    <td style={{ padding: '10px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 30, height: 30, borderRadius: 7,
                                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                                            }}>
                                                <img src={item.iconUrl} alt={item.name} style={{ width: 22, height: 22, objectFit: 'contain' }}
                                                    onError={e => { (e.target as HTMLImageElement).src = 'https://l2db.info/icon/weapon_the_sword_of_hero_i00.png'; }} />
                                            </div>
                                            <span style={{ fontWeight: 600, color: item.name.includes('+') ? 'var(--gold)' : 'var(--text-primary)' }}>
                                                {cleanItemName(item.name)}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <span style={{ fontWeight: 700, color: 'var(--gold)' }}>
                                                {formatCurrency(item.price, item.currency)} {item.currency}
                                            </span>
                                            {extractQuantity(item.name) > 1 && (
                                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                    {extractQuantity(item.name).toLocaleString()}x · {formatCurrency(item.price / extractQuantity(item.name), item.currency)} {item.currency}/un
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 11 }}>{formatTime(item.timestamp)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Responsive */}
            <style>{`
                @media (max-width: 640px) {
                    div[style*="repeat(4, 1fr)"] {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }
            `}</style>
        </div>
    );
}
