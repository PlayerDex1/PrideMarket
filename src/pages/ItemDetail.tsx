import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, TrendingDown, TrendingUp, BarChart2, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { supabase } from '../lib/supabase';
import { cleanItemName, formatPrice, formatDateTime, extractQuantity } from '../lib/format';

const SERVER_ID = 'pride';

interface HistoryItem {
    id: string;
    name: string;
    price: number;
    currency: string;
    timestamp: string;
    icon_url: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#0d0d14', border: '1px solid var(--border-bright)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 5px', fontSize: 11 }}>{label}</p>
            <p style={{ color: 'var(--gold)', margin: 0, fontWeight: 700, fontSize: 14 }}>
                {formatPrice(payload[0].value)} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>PC</span>
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
            .from('pride_market_items')
            .select('*')
            .ilike('name', `%${name}%`)
            .order('timestamp', { ascending: true })
            .limit(200);
        if (data) setHistory(data as HistoryItem[]);
        setLoading(false);
    }, [name]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    /* Stats */
    const prices = useMemo(() => history.map(h => h.price), [history]);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const avgPrice = prices.length ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;
    const lastPrice = prices.length ? prices[prices.length - 1] : 0;
    const firstPrice = prices.length ? prices[0] : 0;
    const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    const chartData = useMemo(() =>
        history.map(h => ({
            time: new Date(h.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            price: h.price,
        })), [history]);

    const firstIcon = history.find(h => h.icon_url)?.icon_url || '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">

            {/* Back */}
            <button
                onClick={() => navigate(-1)}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content',
                    background: 'none', border: 'none', fontSize: 13, color: 'var(--text-secondary)',
                    cursor: 'pointer', padding: '4px 0', fontFamily: 'var(--font-sans)', transition: 'color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
            >
                <ArrowLeft size={14} /> Voltar ao mercado
            </button>

            {/* Item hero */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 20, padding: 24,
                background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(20,10,14,0.95) 100%)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', position: 'relative', overflow: 'hidden',
            }}>
                {/* Decorative glow */}
                <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,57,70,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

                {/* Icon */}
                <div className="icon-box" style={{ width: 80, height: 80, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', flexShrink: 0 }}>
                    {firstIcon
                        ? <img src={firstIcon} alt={name} style={{ width: 64, height: 64, objectFit: 'contain' }}
                            onError={e => { (e.target as HTMLImageElement).src = 'https://l2db.info/icon/weapon_the_sword_of_hero_i00.png'; }} />
                        : <Package size={30} color="var(--text-muted)" />}
                </div>

                {/* Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', textTransform: 'capitalize' }}>
                        {name}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {history.length} listagem{history.length !== 1 ? 's' : ''}
                        </span>
                        {!loading && prices.length > 1 && (
                            <span style={{
                                fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                                background: priceChange >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(230,57,70,0.1)',
                                color: priceChange >= 0 ? 'var(--green)' : 'var(--accent)',
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
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Último preço</p>
                        <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 900, color: 'var(--gold)', letterSpacing: '-1px' }}>
                            {formatPrice(lastPrice)}
                        </p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>Pride Coin</p>
                    </div>
                )}
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                    { label: 'Mínimo', value: formatPrice(minPrice), raw: null, icon: TrendingDown, color: 'var(--green)', bg: 'rgba(34,197,94,0.08)' },
                    { label: 'Máximo', value: formatPrice(maxPrice), raw: null, icon: TrendingUp, color: 'var(--accent)', bg: 'rgba(230,57,70,0.08)' },
                    { label: 'Média', value: formatPrice(avgPrice), raw: null, icon: BarChart2, color: 'var(--gold)', bg: 'rgba(244,162,97,0.08)' },
                    { label: 'Listagens', value: null, raw: `${history.length}×`, icon: Clock, color: 'var(--purple)', bg: 'rgba(167,139,250,0.08)' },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                            <s.icon size={15} color={s.color} />
                        </div>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>{s.label}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 800 }}>
                            {s.raw ?? `${s.value} PC`}
                        </p>
                    </div>
                ))}
            </div>

            {/* Price chart */}
            <div className="glass-card" style={{ padding: 20 }}>
                <h2 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BarChart2 size={14} color="var(--accent)" /> Histórico de Preços
                </h2>
                {loading
                    ? <div className="shimmer" style={{ height: 220, borderRadius: 10 }} />
                    : chartData.length < 2
                        ? <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Dados insuficientes</div>
                        : (
                            <ResponsiveContainer width="100%" height={230}>
                                <LineChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="time" tick={{ fill: '#44445a', fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fill: '#44445a', fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <ReferenceLine y={avgPrice} stroke="var(--gold)" strokeDasharray="4 4" strokeOpacity={0.5} />
                                    <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2.5}
                                        dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
                                        activeDot={{ r: 5, fill: '#f87171', strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
            </div>

            {/* History table */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Histórico de Listagens</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Item', 'Preço', 'Por unidade', 'Data/Hora'].map(col => (
                                    <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--bg-elevated)', whiteSpace: 'nowrap' }}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...history].reverse().map(item => {
                                const qty = extractQuantity(item.name);
                                return (
                                    <tr key={item.id} className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="icon-box" style={{ width: 30, height: 30 }}>
                                                    <img src={item.icon_url} alt={item.name} style={{ width: 22, height: 22, objectFit: 'contain' }}
                                                        onError={e => { (e.target as HTMLImageElement).src = 'https://l2db.info/icon/weapon_the_sword_of_hero_i00.png'; }} />
                                                </div>
                                                <span style={{ fontWeight: 600, color: item.name.startsWith('+') ? 'var(--gold)' : 'var(--text-primary)' }}>
                                                    {cleanItemName(item.name)}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                                            {formatPrice(item.price)} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>PC</span>
                                        </td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                                            {qty > 1 ? `${formatPrice(item.price / qty)} PC/un` : '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                                            {formatDateTime(item.timestamp)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
        @media (max-width: 640px) {
          div[style*="repeat(4,1fr)"] { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
        </div>
    );
}
