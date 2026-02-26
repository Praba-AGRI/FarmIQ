import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, ChevronLeft, ShoppingCart, BarChart2, WifiOff, X, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import marketCommunityService from '../services/marketCommunityService';

const MOCK_PRICES = [
    { crop_name: 'maize', district: 'Coimbatore', current_price: 22.5, price_7_day_avg: 21.8, price_30_day_avg: 20.5, seasonal_avg: 19.5, volatility_index: 0.12, demand_trend: 'rising' },
    { crop_name: 'wheat', district: 'Coimbatore', current_price: 25.0, price_7_day_avg: 25.2, price_30_day_avg: 24.8, seasonal_avg: 24.0, volatility_index: 0.05, demand_trend: 'stable' },
    { crop_name: 'tomato', district: 'Coimbatore', current_price: 18.0, price_7_day_avg: 22.0, price_30_day_avg: 35.0, seasonal_avg: 25.0, volatility_index: 0.45, demand_trend: 'falling' },
];

const MOCK_HISTORY = {
    maize: [
        { date: '01/28', price: 18.2 }, { date: '01/30', price: 18.8 }, { date: '02/01', price: 19.0 },
        { date: '02/03', price: 19.8 }, { date: '02/05', price: 20.3 }, { date: '02/07', price: 20.8 },
        { date: '02/09', price: 21.0 }, { date: '02/11', price: 21.0 }, { date: '02/13', price: 21.6 },
        { date: '02/15', price: 21.8 }, { date: '02/17', price: 21.9 }, { date: '02/19', price: 22.3 },
        { date: '02/21', price: 22.0 }, { date: '02/23', price: 22.2 }, { date: '02/26', price: 22.5 },
    ],
    wheat: [
        { date: '01/28', price: 24.5 }, { date: '01/30', price: 24.4 }, { date: '02/01', price: 24.6 },
        { date: '02/03', price: 24.9 }, { date: '02/05', price: 24.8 }, { date: '02/07', price: 25.1 },
        { date: '02/09', price: 24.9 }, { date: '02/11', price: 25.1 }, { date: '02/13', price: 25.2 },
        { date: '02/15', price: 25.2 }, { date: '02/17', price: 25.0 }, { date: '02/19', price: 25.3 },
        { date: '02/21', price: 25.0 }, { date: '02/23', price: 25.2 }, { date: '02/26', price: 25.0 },
    ],
    tomato: [
        { date: '01/28', price: 42.0 }, { date: '01/30', price: 39.0 }, { date: '02/01', price: 36.5 },
        { date: '02/03', price: 35.5 }, { date: '02/05', price: 32.5 }, { date: '02/07', price: 30.0 },
        { date: '02/09', price: 29.0 }, { date: '02/11', price: 26.0 }, { date: '02/13', price: 25.0 },
        { date: '02/15', price: 23.5 }, { date: '02/17', price: 23.0 }, { date: '02/19', price: 21.5 },
        { date: '02/21', price: 20.5 }, { date: '02/23', price: 19.0 }, { date: '02/26', price: 18.0 },
    ],
};

const CROP_COLORS = { maize: '#10B981', wheat: '#F59E0B', tomato: '#EF4444', rice: '#3B82F6', cotton: '#8B5CF6' };

const getDemandConfig = (trend) => {
    switch (trend) {
        case 'rising': return { cls: 'bg-green-100 text-green-700 border-green-200', icon: TrendingUp, label: 'RISING', color: '#10B981' };
        case 'falling': return { cls: 'bg-red-100 text-red-700 border-red-200', icon: TrendingDown, label: 'FALLING', color: '#EF4444' };
        default: return { cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Minus, label: 'STABLE', color: '#F59E0B' };
    }
};

const PriceHistoryModal = ({ crop, historyData, onClose }) => {
    const chartColor = CROP_COLORS[crop?.crop_name] || '#10B981';
    const min = Math.min(...historyData.map(d => d.price));
    const max = Math.max(...historyData.map(d => d.price));
    const change = historyData.length >= 2 ? historyData[historyData.length - 1].price - historyData[0].price : 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 capitalize">{crop?.crop_name} — 30-Day Price History</h2>
                        <p className="text-sm text-gray-500">{crop?.district} Mandi</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-xl text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-semibold">Today</p>
                        <p className="text-lg font-black text-gray-900">₹{crop?.current_price}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-semibold">30-Day High</p>
                        <p className="text-lg font-black text-green-600">₹{max.toFixed(1)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-semibold">30-Day Low</p>
                        <p className="text-lg font-black text-red-600">₹{min.toFixed(1)}</p>
                    </div>
                </div>

                <div className={`flex items-center gap-2 text-sm font-semibold p-2 rounded-xl ${change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(change).toFixed(2)} ({change >= 0 ? '+' : ''}{((change / historyData[0].price) * 100).toFixed(1)}%) over 30 days
                </div>

                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} domain={['auto', 'auto']} tickFormatter={v => `₹${v}`} />
                            <Tooltip formatter={(v) => [`₹${v}/kg`, 'Price']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2.5} fill="url(#priceGrad)" dot={false} activeDot={{ r: 5 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-center text-gray-400">Click anywhere outside to close</p>
            </div>
        </div>
    );
};

const MarketPage = () => {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usingMock, setUsingMock] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        marketCommunityService.getMarketPrices()
            .then(data => setPrices(data))
            .catch(() => { setPrices(MOCK_PRICES); setUsingMock(true); })
            .finally(() => setLoading(false));
    }, []);

    const openHistory = async (crop) => {
        setSelectedCrop(crop);
        setHistoryLoading(true);
        try {
            const data = await marketCommunityService.getPriceHistory(crop.crop_name);
            const formatted = (data.price_history || []).map(h => ({
                date: h.date.slice(5).replace('-', '/'),
                price: h.price,
            }));
            setHistoryData(formatted.length ? formatted : MOCK_HISTORY[crop.crop_name] || []);
        } catch {
            setHistoryData(MOCK_HISTORY[crop.crop_name] || []);
        } finally {
            setHistoryLoading(false);
        }
    };

    if (loading) return (
        <div className="p-8 flex items-center justify-center gap-3 text-emerald-600 font-medium min-h-screen">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            Loading Market Intelligence...
        </div>
    );

    // Build combined trend chart from mock history
    const trendData = MOCK_HISTORY.maize.map((m, i) => ({
        date: m.date,
        maize: m.price,
        wheat: MOCK_HISTORY.wheat[i]?.price,
        tomato: MOCK_HISTORY.tomato[i]?.price,
    }));

    return (
        <>
            {selectedCrop && !historyLoading && (
                <PriceHistoryModal crop={selectedCrop} historyData={historyData} onClose={() => setSelectedCrop(null)} />
            )}

            <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">
                <div className="flex items-center gap-2">
                    <Link to="/dashboard" className="text-emerald-600 hover:text-emerald-700"><ChevronLeft className="w-5 h-5" /></Link>
                    <h1 className="text-2xl font-bold text-gray-800">Market Intelligence</h1>
                    {usingMock && (
                        <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full font-medium">
                            <WifiOff className="w-3 h-3" /> Demo Data
                        </span>
                    )}
                </div>

                {/* Live Price Cards */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-emerald-600" /> Today's Market Prices
                        </h2>
                        <span className="text-xs text-gray-400">Tap a card to view 30-day history</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {prices.map((item, idx) => {
                            const demand = getDemandConfig(item.demand_trend);
                            const Icon = demand.icon;
                            const cropColor = CROP_COLORS[item.crop_name] || '#9CA3AF';
                            const pctChange = ((item.current_price - item.price_7_day_avg) / item.price_7_day_avg * 100).toFixed(1);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => openHistory(item)}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all text-left w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cropColor }}></div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 capitalize">{item.crop_name}</h3>
                                                <p className="text-xs text-gray-400">{item.district} · Updated today</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${demand.cls}`}>
                                            <Icon className="w-3 h-3" /> {demand.label}
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between">
                                        <div>
                                            <span className="text-[10px] text-gray-400 uppercase font-semibold">Current Price</span>
                                            <p className="text-3xl font-black" style={{ color: cropColor }}>₹{item.current_price}<span className="text-sm font-normal text-gray-400">/kg</span></p>
                                        </div>
                                        <div className="text-right text-xs space-y-0.5">
                                            <p className="text-gray-400">7-day avg: <span className="font-semibold text-gray-700">₹{item.price_7_day_avg}</span></p>
                                            <p className="text-gray-400">30-day avg: <span className="font-semibold text-gray-700">₹{item.price_30_day_avg}</span></p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 pt-2 border-t border-gray-50">
                                        <Icon className="w-3.5 h-3.5" style={{ color: demand.color }} />
                                        <span className="text-xs font-semibold" style={{ color: demand.color }}>
                                            {pctChange >= 0 ? '+' : ''}{pctChange}% vs last week
                                        </span>
                                        <span className="ml-auto text-[10px] text-gray-400 underline">View history →</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Combined Trend Chart */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-emerald-600" /> 30-Day Price Trends Comparison
                    </h2>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => `₹${v}`} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(v, n) => [`₹${v}/kg`, n.charAt(0).toUpperCase() + n.slice(1)]} />
                                    <Legend />
                                    <Line type="monotone" dataKey="maize" stroke="#10B981" strokeWidth={2.5} dot={false} name="Maize" />
                                    <Line type="monotone" dataKey="wheat" stroke="#F59E0B" strokeWidth={2.5} dot={false} name="Wheat" />
                                    <Line type="monotone" dataKey="tomato" stroke="#EF4444" strokeWidth={2.5} dot={false} name="Tomato" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700">
                                <strong>Market Insight:</strong> Maize prices rising steadily (+24% this month). Tomato price has dropped 57% — seasonal surplus. Wheat remains the most stable option for sell planning.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default MarketPage;
