import { Link, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { TrendingUp, LineChart, Search, Sword, Activity, X, Menu } from 'lucide-react';
import CommandPalette from './CommandPalette';

const NAV = [
    { name: 'Mercado', href: '/', icon: TrendingUp, desc: 'Feed ao vivo' },
    { name: 'Analytics', href: '/analytics', icon: LineChart, desc: 'Métricas e gráficos' },
];

export default function Layout() {
    const { pathname } = useLocation();
    const [cmdOpen, setCmdOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    useEffect(() => {
        document.title = 'PrideMarket — Lineage 2 Market Tracker';
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCmdOpen(v => !v);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>
            <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

            {/* Mobile nav overlay */}
            {mobileNavOpen && (
                <div
                    className="fixed inset-0 z-50 flex"
                    onClick={() => setMobileNavOpen(false)}
                >
                    <div
                        className="w-72 h-full flex flex-col animate-slide-in"
                        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', padding: '24px 16px' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Logo */}
                        <div className="flex items-center justify-between mb-8">
                            <Link to="/" className="flex items-center gap-2.5" onClick={() => setMobileNavOpen(false)}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'linear-gradient(135deg, #e63946 0%, #c1121f 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 16px rgba(230, 57, 70, 0.35)'
                                }}>
                                    <Sword size={18} color="#fff" />
                                </div>
                                <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                                    Pride<span style={{ color: 'var(--accent)' }}>Market</span>
                                </span>
                            </Link>
                            <button onClick={() => setMobileNavOpen(false)} style={{ color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>
                        </div>
                        {NAV.map(item => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`nav-link mb-1 ${isActive ? 'active' : ''}`}
                                    onClick={() => setMobileNavOpen(false)}
                                >
                                    <item.icon size={16} />
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.desc}</div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                    <div className="flex-1" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                </div>
            )}

            {/* Header */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 40,
                borderBottom: '1px solid var(--border)',
                background: 'rgba(5, 5, 8, 0.85)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
            }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', height: 58, display: 'flex', alignItems: 'center', gap: 16 }}>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileNavOpen(true)}
                        className="sm:hidden"
                        style={{ color: 'var(--text-secondary)', padding: 6 }}
                    >
                        <Menu size={18} />
                    </button>

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 shrink-0">
                        <div style={{
                            width: 33, height: 33, borderRadius: 9,
                            background: 'linear-gradient(135deg, #e63946 0%, #c1121f 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(230, 57, 70, 0.35)',
                            flexShrink: 0,
                        }}>
                            <Sword size={15} color="#fff" />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px', color: 'var(--text-primary)' }} className="hidden sm:block">
                            Pride<span style={{ color: 'var(--accent)' }}>Market</span>
                        </span>
                    </Link>

                    {/* Search bar CMD+K */}
                    <button
                        id="search-trigger"
                        onClick={() => setCmdOpen(true)}
                        style={{
                            flex: 1, maxWidth: 360,
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 14px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            color: 'var(--text-muted)',
                            fontSize: 13,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                    >
                        <Search size={13} />
                        <span className="hidden sm:inline">Buscar item no mercado...</span>
                        <span className="inline sm:hidden">Buscar...</span>
                        <div className="hidden sm:flex items-center gap-1 ml-auto">
                            <kbd style={{ padding: '2px 6px', background: 'var(--bg-overlay)', border: '1px solid var(--border-bright)', borderRadius: 5, fontSize: 10, fontFamily: 'inherit' }}>Ctrl</kbd>
                            <kbd style={{ padding: '2px 6px', background: 'var(--bg-overlay)', border: '1px solid var(--border-bright)', borderRadius: 5, fontSize: 10, fontFamily: 'inherit' }}>K</kbd>
                        </div>
                    </button>

                    {/* Nav */}
                    <nav className="hidden sm:flex items-center gap-1 shrink-0">
                        {NAV.map(item => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <Link key={item.name} to={item.href} className={`nav-link ${isActive ? 'active' : ''}`}>
                                    <item.icon size={14} />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Live badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 12px', borderRadius: 99,
                        background: 'rgba(34, 197, 94, 0.08)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        flexShrink: 0,
                    }}>
                        <div className="live-dot" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: '0.5px' }}>LIVE</span>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main style={{ flex: 1, maxWidth: 1280, margin: '0 auto', width: '100%', padding: '28px 20px 48px' }}>
                <Outlet />
            </main>

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid var(--border)',
                padding: '18px 20px',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text-muted)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Activity size={12} style={{ color: 'var(--accent)' }} />
                    PrideMarket — Lineage 2 Real-time Market Tracker
                    <span style={{ color: 'var(--border-bright)' }}>·</span>
                    <span>Dados atualizados a cada 5s</span>
                </div>
            </footer>
        </div>
    );
}
