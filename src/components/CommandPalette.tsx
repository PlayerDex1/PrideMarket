import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, X, TrendingUp, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/format';

interface Result {
    name: string;
    price: number;
    currency: string;
    timestamp: string;
    normalized: string;
}

interface CommandPaletteProps {
    open: boolean;
    onClose: () => void;
}

function normalizeItemName(name: string) {
    return name.replace(/^\+\d+\s*/, '').trim();
}

function cleanItemName(name: string) {
    return name.replace(/\s*was added on the market\s*/i, '').trim();
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setQuery('');
            setResults([]);
            setSelected(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const timeout = setTimeout(async () => {
            setLoading(true);
            const { data } = await supabase
                .from('market_items')
                .select('name, price, currency, timestamp')
                .ilike('name', `%${query}%`)
                .eq('server_id', 'pride')
                .order('timestamp', { ascending: false })
                .limit(8);
            if (data) {
                const seen = new Set<string>();
                const deduped = data.reduce<Result[]>((acc, d) => {
                    const key = normalizeItemName(d.name);
                    if (!seen.has(key)) {
                        seen.add(key);
                        acc.push({ name: d.name, price: d.price, currency: d.currency, timestamp: d.timestamp, normalized: key });
                    }
                    return acc;
                }, []);
                setResults(deduped);
                setSelected(0);
            }
            setLoading(false);
        }, 200);
        return () => clearTimeout(timeout);
    }, [query]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!open) return;
            if (e.key === 'Escape') onClose();
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

    const go = (name: string) => { navigate(`/item/${encodeURIComponent(name)}`); onClose(); };
    const fmt = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                paddingTop: '14vh', paddingLeft: 16, paddingRight: 16,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={onClose}
        >
            <div
                className="animate-fade-in-scale"
                style={{
                    width: '100%', maxWidth: 580,
                    background: '#0d0d14',
                    border: '1px solid #2a2a40',
                    borderRadius: 18,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(230,57,70,0.05)',
                    overflow: 'hidden',
                    fontFamily: 'var(--font-sans)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Input row */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px',
                    borderBottom: `1px solid ${query && results.length > 0 ? '#2a2a40' : 'transparent'}`,
                }}>
                    <Search size={18} style={{ color: query ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0, transition: 'color 0.2s' }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar item no mercado Pride..."
                        style={{
                            flex: 1, background: 'transparent',
                            border: 'none', outline: 'none',
                            fontSize: 15, color: 'var(--text-primary)',
                            fontFamily: 'var(--font-sans)',
                        }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {query && (
                            <button onClick={() => setQuery('')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 3, display: 'flex', borderRadius: 4 }}>
                                <X size={14} />
                            </button>
                        )}
                        <kbd style={{
                            padding: '3px 8px', background: 'var(--bg-overlay)', border: '1px solid var(--border-bright)',
                            borderRadius: 6, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)',
                        }}>ESC</kbd>
                    </div>
                </div>

                {/* Results */}
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {loading && (
                        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="shimmer" style={{ height: 44, borderRadius: 10 }} />
                            ))}
                        </div>
                    )}

                    {!loading && query && results.length === 0 && (
                        <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                            <Package size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 12px' }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Nenhum item para "<span style={{ color: 'var(--text-secondary)' }}>{query}</span>"</p>
                        </div>
                    )}

                    {!loading && !query && (
                        <div style={{ padding: '20px 18px', textAlign: 'center' }}>
                            <Search size={28} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 10px' }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Digite para buscar itens no mercado...</p>
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div style={{ padding: '8px' }}>
                            {results.map((r, i) => (
                                <button
                                    key={r.normalized}
                                    onClick={() => go(r.normalized)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '10px 12px', borderRadius: 10,
                                        background: i === selected ? 'rgba(230,57,70,0.08)' : 'transparent',
                                        border: `1px solid ${i === selected ? 'rgba(230,57,70,0.2)' : 'transparent'}`,
                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                                        fontFamily: 'var(--font-sans)',
                                    }}
                                    onMouseEnter={() => setSelected(i)}
                                >
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        background: i === selected ? 'rgba(230,57,70,0.1)' : 'var(--bg-elevated)',
                                        border: '1px solid var(--border)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <TrendingUp size={14} color={i === selected ? 'var(--accent)' : 'var(--text-muted)'} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            margin: 0, fontSize: 13, fontWeight: 600,
                                            color: r.name.includes('+') ? 'var(--gold)' : 'var(--text-primary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>{cleanItemName(r.name)}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                                            {formatCurrency(r.price, r.currency)} {r.currency}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                                        <Clock size={9} /> {fmt(r.timestamp)}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer hints */}
                <div style={{
                    padding: '10px 18px', borderTop: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 16,
                    fontSize: 10, color: 'var(--text-muted)',
                }}>
                    {[['↑↓', 'navegar'], ['↵', 'abrir'], ['ESC', 'fechar']].map(([key, label]) => (
                        <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <kbd style={{ padding: '1px 5px', background: 'var(--bg-overlay)', border: '1px solid var(--border-bright)', borderRadius: 4, fontFamily: 'var(--font-sans)' }}>{key}</kbd>
                            {label}
                        </span>
                    ))}
                    <span style={{ marginLeft: 'auto' }}>Pride<span style={{ color: 'var(--accent)' }}>Market</span></span>
                </div>
            </div>
        </div>
    );
}
