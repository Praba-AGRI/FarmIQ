import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Info, ChevronLeft, ShoppingCart, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import marketCommunityService from '../services/marketCommunityService';

const MarketPage = () => {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMarketData = async () => {
            try {
                const result = await marketCommunityService.getMarketPrices();
                setPrices(result);
            } catch (err) {
                setError("Failed to load market intelligence. Please try again later.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMarketData();
    }, []);

    if (loading) return <div className="p-8 text-center text-emerald-600 font-medium">Loading Market Intelligence...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    // Mock trend data for charts (30 days)
    const generateTrendData = (basePrice) => {
        return Array.from({ length: 30 }, (_, i) => ({
            day: i + 1,
            price: basePrice + (Math.random() * 4 - 2)
        }));
    };

    const getDemandColor = (trend) => {
        switch (trend) {
            case 'rising': return 'bg-green-100 text-green-700 border-green-200';
            case 'falling': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center space-x-2">
                <Link to="/dashboard" className="text-emerald-600 hover:text-emerald-700">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Market Intelligence</h1>
            </div>

            {/* Live Market Prices Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-emerald-600" />
                        Live Market Prices
                    </h2>
                    <span className="text-xs text-gray-400">Last updated: Today, 09:30 AM</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {prices.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 capitalize">{item.crop_name}</h3>
                                    <p className="text-sm text-gray-500">{item.district}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getDemandColor(item.demand_trend)} uppercase tracking-wider`}>
                                    {item.demand_trend}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400 uppercase font-semibold">Current Price</span>
                                    <p className="text-xl font-bold text-emerald-600">₹{item.current_price}/kg</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400 uppercase font-semibold">30-Day Avg</span>
                                    <p className="text-xl font-bold text-gray-700">₹{item.price_30_day_avg}/kg</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 text-xs">
                                {item.demand_trend === 'rising' ? (
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                ) : item.demand_trend === 'falling' ? (
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                ) : (
                                    <Minus className="w-4 h-4 text-yellow-500" />
                                )}
                                <span className={item.demand_trend === 'rising' ? 'text-green-600' : item.demand_trend === 'falling' ? 'text-red-600' : 'text-yellow-600'}>
                                    {Math.abs(((item.current_price - item.price_7_day_avg) / item.price_7_day_avg) * 100).toFixed(1)}% {item.demand_trend === 'rising' ? 'up' : 'down'} vs last week
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Price Trend Analytics */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-emerald-600" />
                    Price Trend Analytics (30 Days)
                </h2>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={prices.length > 0 ? generateTrendData(prices[0].current_price) : []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="day"
                                    label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }}
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    axisLine={{ stroke: '#E5E7EB' }}
                                />
                                <YAxis
                                    label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft' }}
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    axisLine={{ stroke: '#E5E7EB' }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [`₹${value.toFixed(2)}`, 'Price']}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="price"
                                    stroke="#10B981"
                                    strokeWidth={3}
                                    dot={{ fill: '#10B981', r: 4 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    name="Maize (Coimbatore)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 flex items-start space-x-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                        <p className="text-sm text-blue-700">
                            <strong>Analytic Note:</strong> Maize prices have shown a steady 12% growth over the last 3 weeks due to export demand. However, historical data suggests a seasonal dip starting next month.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default MarketPage;
