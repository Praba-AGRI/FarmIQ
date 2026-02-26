import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Users, MapPin, AlertTriangle, TrendingUp, ChevronLeft, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import marketCommunityService from '../services/marketCommunityService';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

// Fallback mock data shown when backend is unavailable
const MOCK_DATA = {
    nearby_farmers: [
        { farmer_id: 'farmer_001', name: 'Rajesh Kumar', district: 'Coimbatore', village: 'Pollachi', latitude: 10.6622, longitude: 77.0065, crop_current: 'maize', sowing_date: '2024-01-15', expected_harvest_date: '2024-05-15', area_acres: 2.5 },
        { farmer_id: 'farmer_002', name: 'Senthil Nathan', district: 'Coimbatore', village: 'Pollachi', latitude: 10.665, longitude: 77.008, crop_current: 'maize', sowing_date: '2024-01-20', expected_harvest_date: '2024-05-20', area_acres: 1.8 },
        { farmer_id: 'farmer_003', name: 'Mani Kandan', district: 'Coimbatore', village: 'Pollachi', latitude: 10.661, longitude: 77.004, crop_current: 'maize', sowing_date: '2024-01-10', expected_harvest_date: '2024-05-10', area_acres: 3.2 },
        { farmer_id: 'farmer_004', name: 'Priya Dharshini', district: 'Coimbatore', village: 'Pollachi', latitude: 10.668, longitude: 77.01, crop_current: 'wheat', sowing_date: '2024-02-01', expected_harvest_date: '2024-06-01', area_acres: 1.5 },
        { farmer_id: 'farmer_005', name: 'Vijay Kumar', district: 'Coimbatore', village: 'Pollachi', latitude: 10.659, longitude: 77.002, crop_current: 'maize', sowing_date: '2024-01-18', expected_harvest_date: '2024-05-18', area_acres: 2.0 },
        { farmer_id: 'farmer_006', name: 'Anitha Devi', district: 'Coimbatore', village: 'Pollachi', latitude: 10.67, longitude: 77.012, crop_current: 'tomato', sowing_date: '2024-02-10', expected_harvest_date: '2024-05-10', area_acres: 1.0 },
    ],
    total_count: 6,
    distribution: {
        crop_distribution: { maize: 66.7, wheat: 16.7, tomato: 16.7 },
        dominant_crop: 'maize',
        oversupply_risk: true,
    },
};

const CommunityPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [usingMock, setUsingMock] = useState(false);

    useEffect(() => {
        const fetchCommunityData = async () => {
            try {
                const result = await marketCommunityService.getCommunityInsights();
                setData(result);
            } catch (err) {
                console.warn('Backend unavailable, showing demo data:', err.message);
                setData(MOCK_DATA);
                setUsingMock(true);
            } finally {
                setLoading(false);
            }
        };
        fetchCommunityData();
    }, []);

    if (loading) return (
        <div className="p-8 flex items-center justify-center gap-3 text-emerald-600 font-medium">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            Loading Community Insights...
        </div>
    );

    const chartData = Object.keys(data.distribution.crop_distribution).map(name => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: data.distribution.crop_distribution[name],
    }));

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center space-x-2 mb-2">
                <Link to="/dashboard" className="text-emerald-600 hover:text-emerald-700">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Community Intelligence</h1>
                {usingMock && (
                    <span className="flex items-center gap-1 ml-2 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full font-medium">
                        <WifiOff className="w-3 h-3" /> Demo Data
                    </span>
                )}
            </div>

            {usingMock && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    Could not reach the backend server. Displaying regional demo data below.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center space-x-4">
                    <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><Users size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Nearby Farmers</p>
                        <p className="text-2xl font-bold">{data.total_count}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><TrendingUp size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Most Cultivated</p>
                        <p className="text-2xl font-bold capitalize">{data.distribution.dominant_crop}</p>
                    </div>
                </div>

                <div className={`bg-white p-6 rounded-2xl shadow-sm flex items-center space-x-4 ${data.distribution.oversupply_risk ? 'border border-red-100' : 'border border-green-100'}`}>
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
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Regional Crop Distribution (%)</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {data.distribution.oversupply_risk && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start space-x-3 text-red-700 text-sm">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <p>
                                <strong>Oversupply Alert:</strong> Over 60% of farmers in your 15 km radius are growing <span className="capitalize font-semibold">{data.distribution.dominant_crop}</span>. This may lead to market saturation and lower prices at harvest.
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Community Cluster</h2>
                    <div className="space-y-3">
                        {data.nearby_farmers.slice(0, 5).map((farmer, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
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
                        {data.nearby_farmers.length > 5 && (
                            <p className="text-center text-sm text-emerald-600 font-medium py-2">{data.total_count - 5} more farmers in your region</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunityPage;
