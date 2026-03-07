import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import MarketHome from './pages/MarketHome';
import Analytics from './pages/Analytics';
import ItemDetail from './pages/ItemDetail';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<MarketHome />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/item/:name" element={<ItemDetail />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
