import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart2, TrendingUp, TrendingDown, Clock, Activity, Package, DollarSign, Layers, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { supabase } from '../lib/supabase';
import { MARKET_TABLE } from '../config/tables';
import { formatCurrency } from '../lib/format';

const SERVER_ID = 'pride';
const SERVER_NAME = 'Pride';
const CURRENCY = 'Pride Coin';

interface MarketItem {
    id: string;
    name: string;
    price: number;
    currency: string;
    timestamp: string;
}

function normalizeItemName(name: string) {
    return name.replace(/^\+\d+\s*/, '').trim();
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#0d0d14', border: '1px solid #1e1e30', borderRadius: 12,
            padding: '10px 14px', fontSize: 12,
        }}>
            <p style={{ color: '#8888aa', margin: '0 0 6px', fontSize: 11 }}>{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: '#f0f0f8', margin: 0, fontWeight: 700 }}>
                    <span style={{ color: p.color }}>{p.value}</span>
                    <span style={{ color: '#4a4a66', marginLeft: 4, fontWeight: 400 }}>{p.name === 'count' ? ' anúncios' : ` ${CURRENCY}`}</span>
                </p>
            ))}
        </div>
    );
};

type TimeFilter = '24h' | '7d' | '30d';

export default function Analytics() {
    const [items, setItems] = useState<MarketItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const days = timeFilter === '24h' ? 1 : timeFilter === '7d' ? 7 : 30;
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        const { data } = await supabase
            .from(MARKET_TABLE)
            .select('id, name, price, currency, timestamp')
            .gte('timestamp', fromDate.toISOString())
            .order('timestamp', { ascending: false })
            .limit(10000);

        if (data) setItems(data);
        setLoading(false);
        setLastRefresh(new Date());
    }, [timeFilter]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const stats = useMemo(() => {
        if (!items.length) return null;
        const now = new Date();
        const todayItems = items.filter(i => new Date(i.timestamp).toDateString() === now.toDateString());
        const freq: Record<string, { count: number; prices: number[] }> = {};
        let totalVolume = 0;

        items.forEach(i => {
            const k = normalizeItemName(i.name);
            if (!freq[k]) freq[k] = { count: 0, prices: [] };
            freq[k].count++;
            freq[k].prices.push(i.price);
            totalVolume += i.price;
        });

        const topItems = Object.entries(freq)
            .map(([name, v]) => ({ name, count: v.count, avg: Math.round(v.prices.reduce((a, b) => a + b, 0) / v.prices.length) }))
            .sort((a, b) => b.count - a.count).slice(0, 10);

        const byTime: Record<string, number> = {};
        let timeData: { time: string; count: number }[] = [];

        if (timeFilter === '24h') {
            for (let h = 0; h < 24; h++) byTime[h] = 0;
            items.forEach(i => {
                const itemDate = new Date(i.timestamp);
                if (now.getTime() - itemDate.getTime() <= 24 * 60 * 60 * 1000) byTime[itemDate.getHours()]++;
            });
            const currentHour = now.getHours();
            timeData = Array.from({ length: 24 }, (_, i) => {
                const h = (currentHour - 23 + i + 24) % 24;
                return { time: `${h}h`, count: byTime[h] };
            });
        } else {
            const days = timeFilter === '7d' ? 7 : 30;
            for (let d = days - 1; d >= 0; d--) {
                const dDate = new Date(now);
                dDate.setDate(dDate.getDate() - d);
                byTime[dDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })] = 0;
            }
            items.forEach(i => {
                const dateStr = new Date(i.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                if (byTime[dateStr] !== undefined) byTime[dateStr]++;
            });
            timeData = Object.entries(byTime).map(([time, count]) => ({ time, count }));
        }

        const mostExpensive = [...items].sort((a, b) => b.price - a.price).slice(0, 8);
        const cheapest = [...items].sort((a, b) => a.price - b.price).slice(0, 8);

        return {
            totalItems: items.length,
            todayCount: todayItems.length,
            uniqueCount: Object.keys(freq).length,
            avgPrice: totalVolume / items.length,
            totalVolume,
            topItems,
            timeData,
            mostExpensive,
            cheapest,
        };
    }, [items]);

    const fmt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, gap: 16 }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'rgba(230,57,70,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Activity size={24} color="#e63946" style={{ animation: 'livePulse 1.5s ease-in-out infinite' }} />
                </div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>Analisando dados do {SERVER_NAME}...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320 }}>
                <Package size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
                <p style={{ color: 'var(--text-muted)' }}>Nenhum dado suficiente para o {SERVER_NAME} ainda.</p>
            </div>
        );
    }

    const kpiCards = [
        { label: 'Volume Hoje', value: stats.todayCount.toLocaleString(), icon: Activity, color: '#e63946', bg: 'rgba(230,57,70,0.1)', border: 'rgba(230,57,70,0.2)' },
        { label: 'Itens Únicos', value: stats.uniqueCount.toLocaleString(), icon: Layers, color: '#22d3ee', bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.18)' },
        { label: 'Preço Médio', value: `${stats.avgPrice.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`, icon: TrendingUp, color: '#f4a261', bg: 'rgba(244,162,97,0.08)', border: 'rgba(244,162,97,0.18)', sub: CURRENCY },
        { label: 'Vol. Movimentado', value: stats.totalVolume > 1e9 ? `${(stats.totalVolume / 1e9).toFixed(2)}B` : stats.totalVolume > 1e6 ? `${(stats.totalVolume / 1e6).toFixed(2)}M` : stats.totalVolume.toFixed(1), icon: DollarSign, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)', sub: CURRENCY },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(230,57,70,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BarChart2 size={18} color="#e63946" />
                        </div>
                        Analytics
                    </h1>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                        Visão detalhada do mercado <strong style={{ color: 'var(--text-primary)' }}>{SERVER_NAME}</strong> · {stats.totalItems} amostras
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 9, padding: 2 }}>
                        {(['24h', '7d', '30d'] as TimeFilter[]).map(f => (
                            <button key={f}
                                onClick={() => setTimeFilter(f)}
                                style={{
                                    padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 7, border: 'none', cursor: 'pointer',
                                    background: timeFilter === f ? 'var(--accent-dim)' : 'transparent',
                                    color: timeFilter === f ? 'var(--accent)' : 'var(--text-muted)',
                                    transition: 'all 0.15s'
                                }}>
                                {f.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    {lastRefresh && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={fetchAll}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                    >
                        <RefreshCw size={12} /> Atualizar
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {kpiCards.map((card, i) => (
                    <div key={card.label} className={`stat-card animate-count stagger-${i + 1}`} style={{ borderColor: card.border }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <card.icon size={16} color={card.color} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{card.label}</h3>
                        </div>
                        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                            {card.value}
                            {card.sub && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 5 }}>{card.sub}</span>}
                        </p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Activity chart */}
                <div className="glass-card" style={{ padding: 22 }}>
                    <div style={{ marginBottom: 20 }}>
                        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Atividade ao Longo do Tempo</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Volume de anúncios postados ({timeFilter.toUpperCase()})</p>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={stats.timeData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradActivity" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#e63946" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#e63946" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2a" vertical={false} />
                            <XAxis dataKey="time" tick={{ fill: '#4a4a66', fontSize: 10 }} tickLine={false} axisLine={false} interval={timeFilter === '30d' ? 4 : 2} />
                            <YAxis tick={{ fill: '#4a4a66', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="count" stroke="#e63946" strokeWidth={2.5} fillOpacity={1} fill="url(#gradActivity)" dot={false} activeDot={{ r: 4, fill: '#e63946', strokeWidth: 0 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Top items chart */}
                <div className="glass-card" style={{ padding: 22 }}>
                    <div style={{ marginBottom: 20 }}>
                        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Itens com Maior Liquidez</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Top 10 por número de listagens</p>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={stats.topItems} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2a" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#4a4a66', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#8888aa', fontSize: 10 }} tickLine={false} axisLine={false}
                                tickFormatter={v => v.length > 16 ? v.slice(0, 16) + '…' : v} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Bar dataKey="count" fill="#e63946" radius={[0, 5, 5, 0]} barSize={14} opacity={0.85} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* High & Low ticket */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                    { title: 'High-Ticket', subtitle: 'Itens com maior preço', icon: TrendingUp, color: '#22c55e', data: stats.mostExpensive, priceColor: '#22c55e' },
                    { title: 'Oportunidades', subtitle: 'Itens com menor preço', icon: TrendingDown, color: '#e63946', data: stats.cheapest, priceColor: '#e63946' },
                ].map(section => (
                    <div key={section.title} className="glass-card" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <section.icon size={15} color={section.color} />
                            <div>
                                <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{section.title}</h2>
                                <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>{section.subtitle}</p>
                            </div>
                        </div>
                        <div style={{ padding: '6px 8px' }}>
                            {section.data.map((item, i) => (
                                <div key={item.id + i}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '9px 10px', borderRadius: 8,
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', width: 18, flexShrink: 0 }}>{i + 1}.</span>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                                            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={9} /> {fmt(item.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', marginLeft: 12, flexShrink: 0 }}>
                                        <span style={{ fontWeight: 800, fontSize: 12, color: section.priceColor, display: 'block' }}>
                                            {formatCurrency(item.price, item.currency)}
                                        </span>
                                        <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.currency || CURRENCY}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Responsive */}
            <style>{`
                @media (max-width: 900px) {
                    div[style*="grid-template-columns: repeat(4"] {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }
                @media (max-width: 768px) {
                    div[style*="grid-template-columns: 1fr 1fr"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
