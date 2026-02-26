import React, { useState, useEffect } from 'react';
import { Target, Users, TrendingUp, AlertCircle, DollarSign, Brain } from 'lucide-react';
import marketCommunityService from '../../services/marketCommunityService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const MarketAdvisoryTab = ({ fieldId }) => {
    const [advisory, setAdvisory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAdvisory = async () => {
            try {
                setLoading(true);
                const data = await marketCommunityService.getMarketAdvisory(fieldId);
                setAdvisory(data);
            } catch (err) {
                setError("Failed to load market advisory.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (fieldId) fetchAdvisory();
    }, [fieldId]);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} />;
    if (!advisory) return null;

    const getDemandColor = (demand) => {
        switch (demand) {
            case 'HIGH_DEMAND': return 'text-green-600 bg-green-50 border-green-200';
            case 'MODERATE_DEMAND': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'OVERSUPPLY_RISK': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getRiskColor = (risk) => {
        switch (risk) {
            case 'LOW': return 'bg-green-100 text-green-800';
            case 'MODERATE': return 'bg-yellow-100 text-yellow-800';
            case 'HIGH': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                    <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600">
                        <Brain size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Agro-Economic Advisory</h3>
                        <p className="text-sm text-gray-600 mt-1 max-w-md">
                            AI-driven insights combining regional farmer activity, market trends, and profitability targets.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-center px-8 border-l border-emerald-200">
                    <span className="text-xs text-emerald-600 uppercase font-bold tracking-wider mb-1">Recommended Crop</span>
                    <span className="text-2xl font-black text-emerald-800 uppercase">{advisory.recommended_crop}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Community Saturation */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <Users className="text-blue-500 w-5 h-5" />
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded">Regional</span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">Community Density</p>
                    <p className="text-xl font-bold text-gray-800 mt-1">{advisory.community_density}</p>
                </div>

                {/* Market Demand */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <TrendingUp className="text-purple-500 w-5 h-5" />
                        <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded border ${getDemandColor(advisory.market_demand)}`}>
                            {advisory.market_demand.replace('_', ' ')}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">Market Demand</p>
                    <p className="text-xl font-bold text-gray-800 mt-1">
                        {advisory.market_demand === 'HIGH_DEMAND' ? 'Excellent' : advisory.market_demand === 'MODERATE_DEMAND' ? 'Stable' : 'Volatile'}
                    </p>
                </div>

                {/* Expected Profit */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <DollarSign className="text-emerald-500 w-5 h-5" />
                    </div>
                    <p className="text-xs text-gray-400 font-medium">Est. Net Profit</p>
                    <p className="text-xl font-bold text-emerald-600 mt-1">₹{advisory.expected_profit.toLocaleString()}</p>
                </div>

                {/* Risk Level */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <AlertCircle className="text-orange-500 w-5 h-5" />
                        <span className={`text-[10px] font-bold uppercase py-0.5 px-2 rounded ${getRiskColor(advisory.risk_level)}`}>
                            {advisory.risk_level} Risk
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">Risk Assessment</p>
                    <p className="text-xl font-bold text-gray-800 mt-1">Verified</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Brain size={120} />
                </div>
                <h4 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-600" />
                    Reasoning Summary
                </h4>
                <p className="text-gray-700 leading-relaxed z-10 relative">
                    {advisory.reasoning_summary}
                </p>

                <div className="mt-8 pt-6 border-t border-gray-50 flex flex-wrap gap-4">
                    <button className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
                        Implement This Recommendation
                    </button>
                    <button className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors">
                        Compare Alternatives
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MarketAdvisoryTab;
