import { useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BarChart2, ShoppingBag, Search, Menu, X } from 'lucide-react';
import CommandPalette from './CommandPalette';

const NAV = [
    { path: '/', label: 'Mercado', icon: ShoppingBag },
    { path: '/analytics', label: 'Analytics', icon: BarChart2 },
];

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const openPalette = useCallback(() => setPaletteOpen(true), []);
    const closePalette = useCallback(() => setPaletteOpen(false), []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>

            {/* ── Header ── */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 100,
                height: 60,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px',
                background: 'rgba(5,5,8,0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--border)',
            }}>

                {/* Logo */}
                <button
                    onClick={() => navigate('/')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                >
                    <div style={{
                        width: 32, height: 32, borderRadius: 8, overflow: 'hidden',
                        boxShadow: '0 0 16px rgba(230,57,70,0.4)',
                        flexShrink: 0,
                    }}>
                        <img src="/Logo.png" alt="PrideMarket" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{
                        fontSize: 16, fontWeight: 800, letterSpacing: '-0.5px',
                        background: 'linear-gradient(135deg, #fff 30%, #e63946 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Pride<span style={{ WebkitTextFillColor: 'var(--accent)' }}>Market</span>
                    </span>
                    {/* LIVE badge */}
                    <span style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '2px 8px', borderRadius: 99,
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                        fontSize: 10, fontWeight: 800, color: 'var(--green)', letterSpacing: 0.5,
                    }}>
                        <span className="live-dot" /> LIVE
                    </span>
                </button>

                {/* Desktop nav */}
                <nav className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {NAV.map(({ path, label, icon: Icon }) => (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={`nav-link${location.pathname === path ? ' active' : ''}`}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </nav>

                {/* Right actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Search / Command Palette */}
                    <button
                        onClick={openPalette}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 12px', borderRadius: 8,
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
                            color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-sans)',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                        }}
                    >
                        <Search size={13} />
                        <span className="hide-mobile">Buscar item...</span>
                        <kbd style={{
                            padding: '1px 5px', borderRadius: 4, fontSize: 10,
                            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-bright)',
                            fontFamily: 'var(--font-sans)', color: 'var(--text-muted)',
                        }}>⌘K</kbd>
                    </button>

                    {/* Mobile hamburger */}
                    <button
                        className="show-mobile"
                        onClick={() => setMenuOpen(v => !v)}
                        style={{
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            borderRadius: 8, padding: 7, color: 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center',
                        }}
                    >
                        {menuOpen ? <X size={16} /> : <Menu size={16} />}
                    </button>
                </div>
            </header>

            {/* Mobile dropdown menu */}
            {menuOpen && (
                <div style={{
                    position: 'fixed', top: 60, left: 0, right: 0,
                    background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
                    padding: 12, display: 'flex', flexDirection: 'column', gap: 4,
                    zIndex: 99, animation: 'fadeIn 0.15s ease',
                }}>
                    {NAV.map(({ path, label, icon: Icon }) => (
                        <button
                            key={path}
                            onClick={() => { navigate(path); setMenuOpen(false); }}
                            className={`nav-link${location.pathname === path ? ' active' : ''}`}
                            style={{ justifyContent: 'flex-start' }}
                        >
                            <Icon size={15} /> {label}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Main content ── */}
            <main style={{ flex: 1, padding: '24px 20px', maxWidth: 1280, width: '100%', margin: '0 auto' }}>
                <Outlet />
            </main>

            {/* ── Footer ── */}
            <footer style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 11, color: 'var(--text-muted)',
            }}>
                <span>PrideMarket · Dados via Supabase</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="live-dot" style={{ width: 5, height: 5 }} />
                    Sincronizando em tempo real
                </span>
            </footer>

            {/* ── Command Palette ── */}
            <CommandPalette open={paletteOpen} onClose={closePalette} />
        </div>
    );
}
