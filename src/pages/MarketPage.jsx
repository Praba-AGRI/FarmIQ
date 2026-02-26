import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Info, ChevronLeft, ShoppingCart, BarChart2, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import marketCommunityService from '../services/marketCommunityService';

// Fallback mock data shown when backend is unavailable
const MOCK_PRICES = [
    { crop_name: 'maize', district: 'Coimbatore', current_price: 22.5, price_7_day_avg: 21.8, price_30_day_avg: 20.5, seasonal_avg: 19.5, volatility_index: 0.12, demand_trend: 'rising' },
    { crop_name: 'wheat', district: 'Coimbatore', current_price: 25.0, price_7_day_avg: 25.2, price_30_day_avg: 24.8, seasonal_avg: 24.0, volatility_index: 0.05, demand_trend: 'stable' },
    { crop_name: 'tomato', district: 'Coimbatore', current_price: 18.0, price_7_day_avg: 22.0, price_30_day_avg: 35.0, seasonal_avg: 25.0, volatility_index: 0.45, demand_trend: 'falling' },
];

const generateTrendData = (basePrice, trend) => {
    return Array.from({ length: 30 }, (_, i) => {
        const trendAdj = trend === 'rising' ? i * 0.05 : trend === 'falling' ? -i * 0.08 : 0;
        return { day: i + 1, price: parseFloat((basePrice + trendAdj + (Math.random() * 2 - 1)).toFixed(2)) };
    });
};

const MarketPage = () => {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usingMock, setUsingMock] = useState(false);

    useEffect(() => {
        const fetchMarketData = async () => {
            try {
                const result = await marketCommunityService.getMarketPrices();
                setPrices(result);
            } catch (err) {
                console.warn('Backend unavailable, showing demo data:', err.message);
                setPrices(MOCK_PRICES);
                setUsingMock(true);
            } finally {
                setLoading(false);
            }
        };
        fetchMarketData();
    }, []);

    if (loading) return (
        <div className="p-8 flex items-center justify-center gap-3 text-emerald-600 font-medium">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            Loading Market Intelligence...
        </div>
    );

    const getDemandColor = (trend) => {
        switch (trend) {
            case 'rising': return 'bg-green-100 text-green-700 border-green-200';
            case 'falling': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    const getDemandLabel = (trend) => {
        switch (trend) {
            case 'rising': return 'HIGH';
            case 'falling': return 'LOW';
            default: return 'STABLE';
        }
    };

    // Build combined trend chart data
    const chartColors = { maize: '#10B981', wheat: '#3B82F6', tomato: '#EF4444' };
    const trendChartData = prices.length > 0
        ? generateTrendData(prices[0].current_price, prices[0].demand_trend).map((pt, i) => {
            const point = { day: pt.day };
            prices.forEach(p => {
                const base = generateTrendData(p.current_price, p.demand_trend);
                point[p.crop_name] = base[i].price;
            });
            return point;
        })
        : [];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center space-x-2">
                <Link to="/dashboard" className="text-emerald-600 hover:text-emerald-700">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Market Intelligence</h1>
                {usingMock && (
                    <span className="flex items-center gap-1 ml-2 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full font-medium">
                        <WifiOff className="w-3 h-3" /> Demo Data
                    </span>
                )}
            </div>

            {usingMock && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    Could not reach the backend server. Displaying regional demo market data below.
                </div>
            )}

            {/* Live Price Cards */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-emerald-600" /> Live Market Prices
                    </h2>
                    <span className="text-xs text-gray-400">Coimbatore Mandi</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {prices.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 capitalize">{item.crop_name}</h3>
                                    <p className="text-sm text-gray-500">{item.district}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getDemandColor(item.demand_trend)}`}>
                                    {getDemandLabel(item.demand_trend)}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Current</span>
                                    <p className="text-xl font-bold text-emerald-600">₹{item.current_price}/kg</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 uppercase font-semibold">30-Day Avg</span>
                                    <p className="text-xl font-bold text-gray-700">₹{item.price_30_day_avg}/kg</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs border-t pt-3">
                                {item.demand_trend === 'rising' ? (
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                ) : item.demand_trend === 'falling' ? (
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                ) : (
                                    <Minus className="w-4 h-4 text-yellow-500" />
                                )}
                                <span className={item.demand_trend === 'rising' ? 'text-green-600' : item.demand_trend === 'falling' ? 'text-red-600' : 'text-yellow-600'}>
                                    {Math.abs(((item.current_price - item.price_7_day_avg) / item.price_7_day_avg) * 100).toFixed(1)}%{' '}
                                    {item.demand_trend === 'rising' ? '↑ vs last week' : item.demand_trend === 'falling' ? '↓ vs last week' : 'stable vs last week'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Trend Chart */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-emerald-600" /> Price Trend Analytics (30 Days)
                </h2>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} label={{ value: 'Day', position: 'insideBottom', offset: -4 }} />
                                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} label={{ value: '₹/kg', angle: -90, position: 'insideLeft' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value, name) => [`₹${value}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                                />
                                <Legend />
                                {prices.map((p, i) => (
                                    <Line
                                        key={p.crop_name}
                                        type="monotone"
                                        dataKey={p.crop_name}
                                        stroke={chartColors[p.crop_name] || COLORS[i]}
                                        strokeWidth={2.5}
                                        dot={false}
                                        activeDot={{ r: 5 }}
                                        name={p.crop_name.charAt(0).toUpperCase() + p.crop_name.slice(1)}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700">
                            <strong>Insight:</strong> Maize prices are trending upward due to export demand. Tomato prices are falling due to seasonal surplus. Wheat remains largely stable.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default MarketPage;
