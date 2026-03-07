import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, ArrowUpDown, ArrowUp, ArrowDown, Activity, Package, X, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cleanItemName, formatPrice, extractQuantity, isNew, formatTime } from '../lib/format';

const SERVER_ID = 'pride';
const POLL_INTERVAL = 15_000; // 15s
const PAGE_SIZE = 50;

interface MarketItem {
    id: string;
    name: string;
    price: number;
    currency: string;
    timestamp: string;
    icon_url: string;
}

type SortKey = 'timestamp' | 'price' | 'name';
type SortDir = 'asc' | 'desc';

function SortIcon({ k, sortKey, dir }: { k: SortKey; sortKey: SortKey; dir: SortDir }) {
    if (k !== sortKey) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return dir === 'desc' ? <ArrowDown size={12} style={{ color: 'var(--accent)' }} /> : <ArrowUp size={12} style={{ color: 'var(--accent)' }} />;
}

export default function MarketHome() {
    const navigate = useNavigate();
    const [items, setItems] = useState<MarketItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currency, setCurrency] = useState('all');
    const [sortKey, setSortKey] = useState<SortKey>('timestamp');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [lastUpd, setLastUpd] = useState<Date | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    /* ── Fetch ── */
    const fetch = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const { data } = await supabase
            .from('market_items')
            .select('id, name, price, currency, timestamp, icon_url')
            .eq('server_id', SERVER_ID)
            .order('timestamp', { ascending: false })
            .limit(500);
        if (data) {
            setItems(data as MarketItem[]);
            setLastUpd(new Date());
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetch(); }, [fetch]);
    useEffect(() => {
        const t = setInterval(() => fetch(true), POLL_INTERVAL);
        return () => clearInterval(t);
    }, [fetch]);

    /* Atalho '/' para focar busca */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    /* ── Stats ── */
    const stats = useMemo(() => {
        const unique = new Set(items.map(i => cleanItemName(i.name).toLowerCase())).size;
        const avg = items.length ? items.reduce((s, i) => s + i.price, 0) / items.length : 0;
        return { total: items.length, unique, avg };
    }, [items]);

    /* ── Ranking sidebar ── */
    const ranking = useMemo(() => {
        const counts: Record<string, { count: number; minPrice: number; name: string }> = {};
        for (const it of items) {
            const key = cleanItemName(it.name).toLowerCase();
            if (!counts[key]) counts[key] = { count: 0, minPrice: it.price, name: cleanItemName(it.name) };
            counts[key].count++;
            if (it.price < counts[key].minPrice) counts[key].minPrice = it.price;
        }
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);
    }, [items]);

    /* ── Filtered + sorted ── */
    const filtered = useMemo(() => {
        let r = items;
        if (currency !== 'all') r = r.filter(i => i.currency.toLowerCase() === currency);
        if (search.trim()) {
            const q = search.toLowerCase();
            r = r.filter(i => cleanItemName(i.name).toLowerCase().includes(q));
        }
        return [...r].sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'timestamp') cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            else if (sortKey === 'price') cmp = a.price - b.price;
            else cmp = cleanItemName(a.name).localeCompare(cleanItemName(b.name));
            return sortDir === 'desc' ? -cmp : cmp;
        }).slice(0, PAGE_SIZE);
    }, [items, search, currency, sortKey, sortDir]);

    const toggleSort = (k: SortKey) => {
        if (sortKey === k) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortKey(k); setSortDir('desc'); }
    };

    const currencies = useMemo(() => {
        const set = new Set(items.map(i => i.currency.toLowerCase()));
        return ['all', ...Array.from(set)];
    }, [items]);

    const MEDAL = ['🥇', '🥈', '🥉'];

    /* ── Render ── */
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">

            {/* Hero stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                    { label: 'Listagens', value: stats.total.toLocaleString(), icon: Package, color: 'var(--accent)', bg: 'rgba(230,57,70,0.08)' },
                    { label: 'Itens únicos', value: stats.unique.toLocaleString(), icon: TrendingUp, color: 'var(--gold)', bg: 'rgba(244,162,97,0.08)' },
                    { label: 'Preço médio', value: `${formatPrice(stats.avg)} PC`, icon: Activity, color: 'var(--purple)', bg: 'rgba(167,139,250,0.08)' },
                ].map(s => (
                    <div key={s.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <s.icon size={18} color={s.color} />
                        </div>
                        <div>
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{s.label}</p>
                            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0', letterSpacing: '-0.5px' }}>{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start' }}>

                {/* Table card */}
                <div className="glass-card" style={{ overflow: 'hidden' }}>

                    {/* Toolbar */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Search */}
                        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Buscar item... (pressione /)"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{
                                    width: '100%', paddingLeft: 30, paddingRight: search ? 30 : 12,
                                    paddingTop: 7, paddingBottom: 7,
                                    background: 'var(--bg-overlay)', border: '1px solid var(--border-bright)',
                                    borderRadius: 8, fontSize: 13, color: 'var(--text-primary)',
                                    fontFamily: 'var(--font-sans)', outline: 'none', transition: 'border-color 0.15s',
                                }}
                                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
                                onBlur={e => { e.target.style.borderColor = 'var(--border-bright)'; }}
                            />
                            {search && (
                                <button onClick={() => setSearch('')}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Currency filters */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {currencies.map(c => (
                                <button key={c} onClick={() => setCurrency(c)}
                                    className={`filter-pill${currency === c ? ' active' : ''}`}>
                                    {c === 'all' ? 'Todas' : c}
                                </button>
                            ))}
                        </div>

                        {/* Last update */}
                        {lastUpd && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={9} /> {lastUpd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
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
                                        <th key={col.key} onClick={() => toggleSort(col.key as SortKey)}
                                            style={{
                                                padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                                                letterSpacing: '0.8px', textTransform: 'uppercase',
                                                color: sortKey === col.key ? 'var(--accent)' : 'var(--text-muted)',
                                                background: 'var(--bg-elevated)', cursor: 'pointer', userSelect: 'none',
                                                whiteSpace: 'nowrap',
                                            }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                {col.label} <SortIcon k={col.key as SortKey} sortKey={sortKey} dir={sortDir} />
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i}><td colSpan={3} style={{ padding: '10px 14px' }}>
                                            <div className="shimmer" style={{ height: 32, borderRadius: 6, animationDelay: `${i * 0.06}s` }} />
                                        </td></tr>
                                    ))
                                    : filtered.length === 0
                                        ? (
                                            <tr><td colSpan={3} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <Package size={32} style={{ margin: '0 auto 10px', opacity: 0.25 }} />
                                                <p style={{ margin: 0, fontSize: 13 }}>Nenhum item encontrado</p>
                                            </td></tr>
                                        )
                                        : filtered.map(item => {
                                            const qty = extractQuantity(item.name);
                                            const unitPrice = qty > 1 ? item.price / qty : null;
                                            const enhanced = item.name.startsWith('+');
                                            const fresh = isNew(item.timestamp);

                                            return (
                                                <tr key={item.id} className="table-row"
                                                    onClick={() => navigate(`/item/${encodeURIComponent(cleanItemName(item.name))}`)}
                                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                    {/* Item name */}
                                                    <td style={{ padding: '10px 14px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div className="icon-box" style={{ width: 36, height: 36 }}>
                                                                <img
                                                                    src={item.icon_url}
                                                                    alt={cleanItemName(item.name)}
                                                                    style={{ width: 28, height: 28, objectFit: 'contain' }}
                                                                    onError={e => { (e.target as HTMLImageElement).src = 'https://l2db.info/icon/weapon_the_sword_of_hero_i00.png'; }}
                                                                />
                                                            </div>
                                                            <div style={{ minWidth: 0 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                    <span style={{ fontWeight: 600, color: enhanced ? 'var(--gold)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {cleanItemName(item.name)}
                                                                    </span>
                                                                    {fresh && <span className="badge-new">● NEW</span>}
                                                                </div>
                                                                {qty > 1 && (
                                                                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                                        {qty.toLocaleString()} unidades
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Price */}
                                                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                                        <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14 }}>
                                                            {formatPrice(item.price)}
                                                        </span>
                                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
                                                            {item.currency}
                                                        </span>
                                                        {unitPrice !== null && (
                                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                                                                {formatPrice(unitPrice)}/un
                                                            </div>
                                                        )}
                                                    </td>
                                                    {/* Time */}
                                                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Clock size={10} /> {formatTime(item.timestamp)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    {!loading && filtered.length > 0 && (
                        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
                            Mostrando {filtered.length} de {items.length} listagens · atualiza a cada 15s
                        </div>
                    )}
                </div>

                {/* ── Ranking sidebar ── */}
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                            Top 10 Itens
                        </h2>
                    </div>
                    {loading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <div className="shimmer" style={{ height: 36, borderRadius: 6 }} />
                            </div>
                        ))
                        : ranking.map((item, i) => (
                            <button key={item.name}
                                onClick={() => navigate(`/item/${encodeURIComponent(item.name)}`)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 14px', background: 'none', border: 'none',
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s', fontFamily: 'var(--font-sans)',
                                }}
                                onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.03)'; }}
                                onMouseLeave={e => { (e.currentTarget).style.background = 'none'; }}
                            >
                                {/* Position badge */}
                                <span style={{
                                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: i < 3 ? 14 : 11, fontWeight: 800,
                                    color: i < 3 ? undefined : 'var(--text-muted)',
                                }}>
                                    {i < 3 ? MEDAL[i] : i + 1}
                                </span>
                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.name}
                                    </p>
                                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
                                        {item.count}× · mín {formatPrice(item.minPrice)} PC
                                    </p>
                                </div>
                            </button>
                        ))}
                </div>
            </div>

            {/* Responsive grid fix */}
            <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: '1fr 260px'"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="gridTemplateColumns: 'repeat(3,1fr)'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </div>
    );
}
