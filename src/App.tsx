import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Layout from './components/Layout';
import MarketHome from './pages/MarketHome';
import ItemDetail from './pages/ItemDetail';
import Analytics from './pages/Analytics';
import Watchlist from './pages/Watchlist';

export default function App() {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<MarketHome />} />
                        <Route path="item/:name" element={<ItemDetail />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="watchlist" element={<Watchlist />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
            <SpeedInsights />
        </>
    );
}
