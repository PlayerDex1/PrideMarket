import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart2, TrendingUp, TrendingDown, Activity, Package, RefreshCw } from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { cleanItemName, formatPrice } from '../lib/format';

const SERVER_ID = 'pride';

interface RawItem {
    name: string;
    price: number;
    currency: string;
    timestamp: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#0d0d14', border: '1px solid var(--border-bright)',
            borderRadius: 10, padding: '10px 14px', fontSize: 12,
        }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 4px', fontSize: 11 }}>{label}</p>
            <p style={{ color: 'var(--gold)', margin: 0, fontWeight: 700, fontSize: 14 }}>
                {typeof payload[0].value === 'number'
                    ? Number(payload[0].value).toLocaleString()
                    : payload[0].value}
            </p>
        </div>
    );
};

export default function Analytics() {
    const [items, setItems] = useState<RawItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true); else setRefreshing(true);
        const { data } = await supabase
            .from('pride_market_items')
            .select('name, price, currency, timestamp')
            .order('timestamp', { ascending: false })
            .limit(1000);
        if (data) { setItems(data as RawItem[]); setLastRefresh(new Date()); }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── KPIs ── */
    const kpis = useMemo(() => {
        if (!items.length) return null;
        const prices = items.map(i => i.price);
        return {
            total: items.length,
            unique: new Set(items.map(i => cleanItemName(i.name).toLowerCase())).size,
            max: Math.max(...prices),
            avg: prices.reduce((s, p) => s + p, 0) / prices.length,
            min: Math.min(...prices),
        };
    }, [items]);

    /* ── Atividade por hora ── */
    const hourlyData = useMemo(() => {
        const map: Record<string, number> = {};
        for (const it of items) {
            const h = new Date(it.timestamp).getHours();
            const key = `${String(h).padStart(2, '0')}h`;
            map[key] = (map[key] || 0) + 1;
        }
        return Array.from({ length: 24 }, (_, h) => {
            const key = `${String(h).padStart(2, '0')}h`;
            return { hour: key, listagens: map[key] || 0 };
        });
    }, [items]);

    /* ── Top itens por volume ── */
    const topItems = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const it of items) {
            const k = cleanItemName(it.name);
            counts[k] = (counts[k] || 0) + 1;
        }
        return Object.entries(counts)
            .map(([name, count]) => ({ name: name.length > 22 ? name.slice(0, 20) + '…' : name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [items]);

    /* ── High ticket ── */
    const highTicket = useMemo(() => {
        const seen = new Set<string>();
        return items
            .filter(i => { const k = cleanItemName(i.name).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
            .sort((a, b) => b.price - a.price)
            .slice(0, 5);
    }, [items]);

    /* ── Oportunidades (abaixo da média) ── */
    const opportunities = useMemo(() => {
        if (!kpis) return [];
        return items
            .filter(i => i.price < kpis.avg * 0.7)
            .sort((a, b) => a.price - b.price)
            .slice(0, 5);
    }, [items, kpis]);

    const BAR_COLORS = ['#e63946', '#f4a261', '#a78bfa', '#60a5fa', '#22c55e', '#fb923c', '#f472b6', '#34d399'];

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="shimmer" style={{ height: 100, borderRadius: 16 }} />
                ))}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Analytics</h1>
                    {lastRefresh && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                            Atualizado às {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => fetchData(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
                        color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--accent)'; (e.currentTarget).style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border-bright)'; (e.currentTarget).style.color = 'var(--text-secondary)'; }}
                >
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {/* KPI cards */}
            {kpis && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                    {[
                        { label: 'Total listagens', value: kpis.total.toLocaleString(), icon: Package, color: 'var(--accent)', border: 'rgba(230,57,70,0.25)', bg: 'rgba(230,57,70,0.08)' },
                        { label: 'Itens únicos', value: kpis.unique.toLocaleString(), icon: Activity, color: 'var(--blue)', border: 'rgba(96,165,250,0.25)', bg: 'rgba(96,165,250,0.08)' },
                        { label: 'Preço mais alto', value: `${formatPrice(kpis.max)} PC`, icon: TrendingUp, color: 'var(--gold)', border: 'rgba(244,162,97,0.25)', bg: 'rgba(244,162,97,0.08)' },
                        { label: 'Preço médio', value: `${formatPrice(kpis.avg)} PC`, icon: BarChart2, color: 'var(--purple)', border: 'rgba(167,139,250,0.25)', bg: 'rgba(167,139,250,0.08)' },
                    ].map(c => (
                        <div key={c.label} className="stat-card" style={{ borderColor: c.border, transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${c.bg}`; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <c.icon size={16} color={c.color} />
                            </div>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>{c.label}</p>
                            <p style={{ margin: '5px 0 0', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{c.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* Hourly activity */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <h2 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Activity size={14} color="var(--accent)" /> Atividade por Hora
                    </h2>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={hourlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="hour" tick={{ fill: '#44445a', fontSize: 9 }} tickLine={false} axisLine={false} interval={3} />
                            <YAxis tick={{ fill: '#44445a', fontSize: 9 }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="listagens" stroke="var(--accent)" strokeWidth={2} fill="url(#actGrad)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Top items */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <h2 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingUp size={14} color="var(--gold)" /> Top Itens (Volume)
                    </h2>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={topItems} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#44445a', fontSize: 9 }} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#8888aa', fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {topItems.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* High ticket + Oportunidades */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* High ticket */}
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={14} color="var(--gold)" />
                        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>High-Ticket</h2>
                    </div>
                    {highTicket.map((item, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                            transition: 'background 0.12s',
                        }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: item.name.startsWith('+') ? 'var(--gold)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                                {cleanItemName(item.name)}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                                {formatPrice(item.price)} <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>PC</span>
                            </span>
                        </div>
                    ))}
                </div>

                {/* Oportunidades */}
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingDown size={14} color="var(--green)" />
                        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Oportunidades</h2>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>&lt; 70% da média</span>
                    </div>
                    {opportunities.length === 0
                        ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Nenhuma oportunidade abaixo de 70% da média</div>
                        : opportunities.map((item, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                                transition: 'background 0.12s',
                            }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.03)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                                    {cleanItemName(item.name)}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', whiteSpace: 'nowrap' }}>
                                    {formatPrice(item.price)} <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>PC</span>
                                </span>
                            </div>
                        ))}
                </div>
            </div>

            {/* Responsive fix */}
            <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: 'repeat(4,1fr)'"],
          div[style*="gridTemplateColumns: '1fr 1fr'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </div>
    );
}
