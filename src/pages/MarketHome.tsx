import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, ArrowUpDown, Zap, TrendingUp, ChevronRight, Activity, Package, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatCompactPrice } from '../lib/format';

const SERVER_ID = 'pride';
const POLL_INTERVAL = 5000;

interface MarketItem {
    id: string;
    name: string;
    price: number;
    currency: string;
    timestamp: string;
    iconUrl: string;
}

function normalizeItemName(name: string) {
    return name.replace(/^\+\d+\s*/, '').trim();
}

function cleanItemName(name: string) {
    return name.replace(/\s*was added on the market\s*/i, '').trim();
}

function extractQuantity(name: string) {
    const match = name.match(/\[\s*(\d+)\s*pcs\.?\]/i) || name.match(/\bx\s*(\d+)\b/i) || name.match(/\b(\d+)\s*x\b/i);
    return match ? parseInt(match[1], 10) : 1;
}

function isNew(ts: string) {
    return Date.now() - new Date(ts).getTime() < 60000;
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const CURRENCIES = ['all', 'pride coin'];
const CURRENCY_LABELS: Record<string, string> = { all: 'Todas', 'pride coin': 'Pride Coin' };

export default function MarketHome() {
    const navigate = useNavigate();
    const [items, setItems] = useState<MarketItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [live, setLive] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [search, setSearch] = useState('');
    const [currencyFilter, setCurrencyFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
    const iconCache = useRef<Record<string, string>>({});
    const searchRef = useRef<HTMLInputElement>(null);

    const fetchItems = useCallback(async () => {
        const { data, error } = await supabase
            .from('market_items')
            .select('*')
            .eq('server_id', SERVER_ID)
            .order('timestamp', { ascending: false })
            .limit(200);
        if (!error && data) {
            setItems(data.map((d: any) => ({
                id: d.id, name: d.name, price: d.price,
                currency: d.currency, timestamp: d.timestamp,
                iconUrl: d.icon_url || '',
            })));
            setLive(true);
            setLastUpdate(new Date());
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchItems();
        const interval = setInterval(fetchItems, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchItems]);

    const ranking = useMemo(() => {
        const counts: Record<string, { count: number; prices: number[] }> = {};
        items.forEach(item => {
            const key = normalizeItemName(item.name);
            if (!iconCache.current[key] && item.iconUrl) iconCache.current[key] = item.iconUrl;
            if (!counts[key]) counts[key] = { count: 0, prices: [] };
            counts[key].count++;
            counts[key].prices.push(item.price);
        });
        return Object.entries(counts).map(([name, v]) => ({
            name, count: v.count,
            minPrice: Math.min(...v.prices),
            avgPrice: Math.round(v.prices.reduce((a, b) => a + b, 0) / v.prices.length),
            icon: iconCache.current[name] || '',
        })).sort((a, b) => b.count - a.count).slice(0, 8);
    }, [items]);

    const todayItems = items.filter(i => new Date(i.timestamp).toDateString() === new Date().toDateString());
    const avgPrice = todayItems.length ? (todayItems.reduce((a, b) => a + b.price, 0) / todayItems.length) : 0;
    const uniqueItems = useMemo(() => new Set(items.map(i => normalizeItemName(i.name))).size, [items]);

    const sorted = [...items]
        .filter(i => {
            const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
            const matchCurrency = currencyFilter === 'all'
                ? true
                : i.currency.toLowerCase() === currencyFilter;
            return matchSearch && matchCurrency;
        })
        .sort((a, b) => {
            const av = (a as any)[sortConfig.key], bv = (b as any)[sortConfig.key];
            return sortConfig.direction === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
        });

    const handleSort = (key: string) => setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'desc' ? 'asc' : 'desc' }));

    const medalColor = (i: number) => {
        if (i === 0) return '#ffd700';
        if (i === 1) return '#c0c0c0';
        if (i === 2) return '#cd7f32';
        return 'var(--text-muted)';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">

            {/* Hero / Page header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px', margin: 0, lineHeight: 1.15 }}>
                            <span style={{ color: 'var(--text-primary)' }}>Mercado </span>
                            <span style={{
                                background: 'linear-gradient(90deg, var(--accent) 0%, #f4a261 100%)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                            }}>Pride</span>
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>
                            Feed ao vivo · Atualiza a cada 5 segundos
                        </p>
                    </div>
                    {lastUpdate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <Clock size={11} />
                            Última sync: {formatTime(lastUpdate.toISOString())}
                        </div>
                    )}
                </div>

                {/* Stats bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                        {
                            label: 'Listagens hoje',
                            value: loading ? '—' : todayItems.length.toLocaleString(),
                            icon: Activity, color: '#e63946',
                            bg: 'rgba(230,57,70,0.1)', border: 'rgba(230,57,70,0.2)',
                        },
                        {
                            label: 'Itens únicos',
                            value: loading ? '—' : uniqueItems.toLocaleString(),
                            icon: Package, color: '#a78bfa',
                            bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)',
                        },
                        {
                            label: 'Preço médio',
                            value: loading ? '—' : `${formatCompactPrice(avgPrice, 'PC')} PC`,
                            icon: TrendingUp, color: 'var(--gold)',
                            bg: 'rgba(244,162,97,0.08)', border: 'rgba(244,162,97,0.18)',
                        },
                    ].map((s, idx) => (
                        <div key={s.label} className={`stat-card animate-count stagger-${idx + 1}`}
                            style={{ borderColor: live ? s.border : 'var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <s.icon size={15} color={s.color} />
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</span>
                            </div>
                            <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 16, alignItems: 'start' }}>

                {/* Market table */}
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    {/* Table toolbar */}
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search */}
                        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Filtrar itens..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{
                                    width: '100%', paddingLeft: 33, paddingRight: search ? 32 : 12, paddingTop: 7, paddingBottom: 7,
                                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                    borderRadius: 8, fontSize: 13, color: 'var(--text-primary)',
                                    outline: 'none', fontFamily: 'var(--font-sans)',
                                }}
                                onFocus={e => { e.target.style.borderColor = 'rgba(230,57,70,0.4)'; }}
                                onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
                            />
                            {search && (
                                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Currency pills */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {CURRENCIES.map(c => (
                                <button key={c} className={`filter-pill ${currencyFilter === c ? 'active' : ''}`}
                                    onClick={() => setCurrencyFilter(c)}>
                                    {CURRENCY_LABELS[c]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {[
                                        { key: 'name', label: 'Item' },
                                        { key: 'price', label: 'Preço' },
                                        { key: 'timestamp', label: 'Hora' },
                                    ].map(col => (
                                        <th key={col.key}
                                            onClick={() => handleSort(col.key)}
                                            style={{
                                                padding: '10px 16px', textAlign: 'left', cursor: 'pointer',
                                                fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
                                                color: sortConfig.key === col.key ? 'var(--accent)' : 'var(--text-muted)',
                                                background: 'var(--bg-elevated)',
                                                userSelect: 'none', whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {col.label}
                                                <ArrowUpDown size={10} style={{ opacity: sortConfig.key === col.key ? 1 : 0.4 }} />
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                            {[180, 120, 80].map((w, j) => (
                                                <td key={j} style={{ padding: '12px 16px' }}>
                                                    <div className="shimmer" style={{ height: 14, borderRadius: 6, width: w }} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : sorted.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                            {live ? 'Nenhum item encontrado.' : 'Aguardando dados do mercado...'}
                                        </td>
                                    </tr>
                                ) : sorted.map((item, idx) => (
                                    <tr
                                        key={item.id}
                                        className={`table-row-hover animate-fade-in stagger-${Math.min(idx + 1, 8)}`}
                                        onClick={() => navigate(`/item/${encodeURIComponent(normalizeItemName(item.name))}`)}
                                        style={{ borderBottom: '1px solid rgba(30,30,48,0.5)', cursor: 'pointer' }}
                                    >
                                        <td style={{ padding: '10px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: 8,
                                                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    overflow: 'hidden', flexShrink: 0,
                                                }}>
                                                    <img src={item.iconUrl} alt={item.name} style={{ width: 28, height: 28, objectFit: 'contain' }}
                                                        onError={e => { (e.target as HTMLImageElement).src = 'https://l2db.info/icon/weapon_the_sword_of_hero_i00.png'; }} />
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontWeight: 600, fontSize: 13,
                                                        color: item.name.includes('+') ? 'var(--gold)' : 'var(--text-primary)',
                                                    }}>{cleanItemName(item.name)}</span>
                                                    {isNew(item.timestamp) && (
                                                        <span className="badge-new" style={{
                                                            fontSize: 9, fontWeight: 800, padding: '2px 7px',
                                                            background: 'rgba(230,57,70,0.15)',
                                                            color: 'var(--accent)', border: '1px solid rgba(230,57,70,0.3)',
                                                            borderRadius: 99, letterSpacing: '0.5px',
                                                        }}>NEW</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gold)' }}>
                                                    {formatCurrency(item.price, item.currency)}
                                                    <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', marginLeft: 4 }}>{item.currency}</span>
                                                </span>
                                                {extractQuantity(item.name) > 1 && (() => {
                                                    const qty = extractQuantity(item.name);
                                                    const unitPrice = item.price / qty;
                                                    return (
                                                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                            {qty.toLocaleString()}x · {formatCurrency(unitPrice, item.currency)} {item.currency}/un
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 11 }}>
                                                <Clock size={10} />
                                                {formatTime(item.timestamp)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Table footer */}
                    {!loading && sorted.length > 0 && (
                        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sorted.length} listagens exibidas</span>
                            {search && <span style={{ fontSize: 11, color: 'var(--accent)' }}>Filtrando por: "{search}"</span>}
                        </div>
                    )}
                </div>

                {/* Ranking sidebar */}
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(230,57,70,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={13} color="var(--accent)" />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Top Itens</p>
                            <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>Mais listados do mercado</p>
                        </div>
                    </div>
                    <div style={{ padding: '8px 8px' }}>
                        {ranking.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
                                Aguardando dados...
                            </p>
                        ) : ranking.map((item, i) => (
                            <button
                                key={item.name}
                                onClick={() => navigate(`/item/${encodeURIComponent(item.name)}`)}
                                className={`animate-fade-in stagger-${i + 1}`}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                                    background: 'none', border: 'none', textAlign: 'left',
                                    transition: 'background 0.15s',
                                    marginBottom: 2,
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                            >
                                {/* Rank number */}
                                <span style={{
                                    fontSize: 12, fontWeight: 800, width: 18, textAlign: 'center', flexShrink: 0,
                                    color: medalColor(i),
                                    textShadow: i < 3 ? `0 0 10px ${medalColor(i)}80` : 'none',
                                }}>{i + 1}</span>

                                {/* Icon */}
                                <div style={{
                                    width: 30, height: 30, borderRadius: 7,
                                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                                }}>
                                    <img src={item.icon} alt={item.name} style={{ width: 22, height: 22, objectFit: 'contain' }}
                                        onError={e => { (e.target as HTMLImageElement).src = 'https://l2db.info/icon/weapon_the_sword_of_hero_i00.png'; }} />
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {cleanItemName(item.name)}
                                    </p>
                                    <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                                        {item.count}x · mín {formatCurrency(item.minPrice, 'PC')} PC
                                    </p>
                                </div>

                                <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Responsive: mobile stacks */}
            <style>{`
                @media (max-width: 768px) {
                    div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }
                    div[style*="repeat(3, 1fr)"] {
                        grid-template-columns: 1fr 1fr !important;
                    }
                }
                @media (max-width: 480px) {
                    div[style*="repeat(3, 1fr)"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
