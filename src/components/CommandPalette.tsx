import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, X, Package, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cleanItemName, normalizeItemName, formatPrice } from '../lib/format';

interface Result {
    name: string;
    price: number;
    currency: string;
    timestamp: string;
    normalized: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    /* Focus on open */
    useEffect(() => {
        if (open) {
            setQuery('');
            setResults([]);
            setSelected(0);
            setTimeout(() => inputRef.current?.focus(), 40);
        }
    }, [open]);

    /* ⌘K / Ctrl+K */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open ? onClose() : void 0; }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    /* Search with debounce */
    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            const { data } = await supabase
                .from('pride_market_items')
                .select('name, price, currency, timestamp')
                .ilike('name', `%${query}%`)
                .order('timestamp', { ascending: false })
                .limit(10);
            if (data) {
                const seen = new Set<string>();
                const deduped = (data as any[]).reduce<Result[]>((acc, d) => {
                    const key = normalizeItemName(d.name).toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        acc.push({ name: cleanItemName(d.name), price: d.price, currency: d.currency, timestamp: d.timestamp, normalized: normalizeItemName(d.name) });
                    }
                    return acc;
                }, []);
                setResults(deduped);
                setSelected(0);
            }
            setLoading(false);
        }, 200);
        return () => clearTimeout(t);
    }, [query]);

    /* Keyboard nav */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!open) return;
            if (e.key === 'Escape') { onClose(); }
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
            if (e.key === 'Enter' && results[selected]) {
                navigate(`/item/${encodeURIComponent(results[selected].normalized)}`);
                onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, results, selected, navigate, onClose]);

    if (!open) return null;

    const go = (r: Result) => {
        navigate(`/item/${encodeURIComponent(r.normalized)}`);
        onClose();
    };

    return (
        /* Backdrop */
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                paddingTop: '14vh', padding: '14vh 16px 0',
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
            }}
            onClick={onClose}
        >
            {/* Panel */}
            <div
                className="animate-fade-in-scale"
                style={{
                    width: '100%', maxWidth: 560,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-bright)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
                    overflow: 'hidden',
                    fontFamily: 'var(--font-sans)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: `1px solid ${query ? 'var(--border)' : 'transparent'}` }}>
                    <Search size={16} style={{ color: query ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0, transition: 'color 0.2s' }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar item no mercado Pride..."
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            fontSize: 15, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
                        }}
                    />
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                        {query && (
                            <button onClick={() => setQuery('')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2, borderRadius: 4 }}>
                                <X size={13} />
                            </button>
                        )}
                        <kbd style={{ padding: '2px 7px', background: 'var(--bg-overlay)', border: '1px solid var(--border-bright)', borderRadius: 5, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>ESC</kbd>
                    </div>
                </div>

                {/* Results */}
                <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                    {/* Shimmer */}
                    {loading && (
                        <div style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 48, borderRadius: 10, animationDelay: `${i * 0.08}s` }} />)}
                        </div>
                    )}

                    {/* No results */}
                    {!loading && query && results.length === 0 && (
                        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                            <Package size={28} style={{ color: 'var(--text-muted)', opacity: 0.25, margin: '0 auto 10px' }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                                Nenhum item para "<span style={{ color: 'var(--text-secondary)' }}>{query}</span>"
                            </p>
                        </div>
                    )}

                    {/* Placeholder */}
                    {!loading && !query && (
                        <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                            <Search size={26} style={{ color: 'var(--text-muted)', opacity: 0.2, margin: '0 auto 8px' }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Digite para buscar itens...</p>
                        </div>
                    )}

                    {/* Result list */}
                    {!loading && results.length > 0 && (
                        <div style={{ padding: 6 }}>
                            {results.map((r, i) => (
                                <button key={r.normalized} onClick={() => go(r)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '9px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                                        background: i === selected ? 'rgba(230,57,70,0.08)' : 'transparent',
                                        border: `1px solid ${i === selected ? 'rgba(230,57,70,0.2)' : 'transparent'}`,
                                        transition: 'all 0.1s', fontFamily: 'var(--font-sans)',
                                    }}
                                    onMouseEnter={() => setSelected(i)}
                                >
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                        background: i === selected ? 'rgba(230,57,70,0.1)' : 'var(--bg-elevated)',
                                        border: '1px solid var(--border)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <TrendingUp size={13} color={i === selected ? 'var(--accent)' : 'var(--text-muted)'} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: r.name.startsWith('+') ? 'var(--gold)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {r.name}
                                        </p>
                                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                                            {formatPrice(r.price)} {r.currency}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                                        <Clock size={9} />
                                        {new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer hints */}
                <div style={{ padding: '9px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, fontSize: 10, color: 'var(--text-muted)' }}>
                    {[['↑↓', 'navegar'], ['↵', 'abrir'], ['ESC', 'fechar']].map(([k, l]) => (
                        <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <kbd style={{ padding: '1px 5px', background: 'var(--bg-overlay)', border: '1px solid var(--border-bright)', borderRadius: 4, fontFamily: 'var(--font-sans)' }}>{k}</kbd>
                            {l}
                        </span>
                    ))}
                    <span style={{ marginLeft: 'auto' }}>Pride<span style={{ color: 'var(--accent)' }}>Market</span></span>
                </div>
            </div>
        </div>
    );
}
