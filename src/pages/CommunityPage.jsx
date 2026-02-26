import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Users, MapPin, AlertTriangle, TrendingUp, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import marketCommunityService from '../services/marketCommunityService';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

const CommunityPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCommunityData = async () => {
            try {
                const result = await marketCommunityService.getCommunityInsights();
                setData(result);
            } catch (err) {
                setError("Failed to load community insights. Please try again later.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCommunityData();
    }, []);

    if (loading) return <div className="p-8 text-center">Loading Community Insights...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    const chartData = Object.keys(data.distribution.crop_distribution).map(name => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: data.distribution.crop_distribution[name]
    }));

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center space-x-2 mb-2">
                <Link to="/dashboard" className="text-emerald-600 hover:text-emerald-700">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Community Intelligence</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Nearby Farmers Summary */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center space-x-4">
                    <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Nearby Farmers</p>
                        <p className="text-2xl font-bold">{data.total_count}</p>
                    </div>
                </div>

                {/* Most Cultivated Crop */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Most Cultivated</p>
                        <p className="text-2xl font-bold capitalize">{data.distribution.dominant_crop}</p>
                    </div>
                </div>

                {/* Risk Level */}
                <div className={`bg-white p-6 rounded-2xl shadow-sm border flex items-center space-x-4 ${data.distribution.oversupply_risk ? 'border-red-100' : 'border-green-100'}`}>
                    <div className={`p-3 rounded-xl ${data.distribution.oversupply_risk ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Regional Risk</p>
                        <p className={`text-2xl font-bold ${data.distribution.oversupply_risk ? 'text-red-600' : 'text-green-600'}`}>
                            {data.distribution.oversupply_risk ? 'Oversupply' : 'Typical'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Crop Distribution Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Regional Crop Distribution (%)</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {data.distribution.oversupply_risk && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start space-x-3 text-red-700 text-sm">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <p>
                                <strong>Oversupply Alert:</strong> Over 60% of farmers in your 15km radius are growing {data.distribution.dominant_crop}. This might lead to market saturation and lower prices at harvest.
                            </p>
                        </div>
                    )}
                </div>

                {/* Community Activity / List */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6 font-medium">Community Cluster</h2>
                    <div className="space-y-4">
                        {data.nearby_farmers.slice(0, 5).map((farmer, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                        {farmer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900">{farmer.name}</h4>
                                        <span className="text-xs text-gray-500">{farmer.village}, {farmer.district}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                                        {farmer.crop_current}
                                    </span>
                                    <p className="text-[10px] text-gray-400 mt-1">Harvest: {farmer.expected_harvest_date}</p>
                                </div>
                            </div>
                        ))}
                        <button className="w-full py-2 text-sm text-emerald-600 font-medium hover:text-emerald-700">
                            View all {data.total_count} farmers
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunityPage;
