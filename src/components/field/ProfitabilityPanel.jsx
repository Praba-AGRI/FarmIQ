import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, PieChart } from 'lucide-react';
import marketCommunityService from '../../services/marketCommunityService';

const ProfitabilityPanel = ({ fieldId }) => {
    const [profitData, setProfitData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfit = async () => {
            try {
                const data = await marketCommunityService.getProfitEstimation(fieldId);
                setProfitData(data);
            } catch (err) {
                console.error("Failed to load profit estimation", err);
            } finally {
                setLoading(false);
            }
        };

        if (fieldId) fetchProfit();
    }, [fieldId]);

    if (loading) return <div className="animate-pulse h-24 bg-gray-100 rounded-xl"></div>;
    if (!profitData) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Profitability Estimate
                </h3>
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Score</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded ${profitData.profit_score > 70 ? 'bg-green-100 text-green-700' :
                            profitData.profit_score > 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {profitData.profit_score}/100
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-gray-500">
                        <TrendingUp size={12} />
                        <span className="text-[10px] font-semibold uppercase">Est. Revenue</span>
                    </div>
                    <p className="text-md font-bold text-gray-900">₹{profitData.estimated_revenue.toLocaleString()}</p>
                </div>
                <div className="space-y-1 text-right">
                    <div className="flex items-center gap-1.5 text-gray-500 justify-end">
                        <CreditCard size={12} />
                        <span className="text-[10px] font-semibold uppercase">Est. Cost</span>
                    </div>
                    <p className="text-md font-bold text-gray-900">₹{profitData.estimated_cost.toLocaleString()}</p>
                </div>
            </div>

            <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600">Net Profit</span>
                </div>
                <p className="text-lg font-black text-emerald-600">₹{profitData.net_profit.toLocaleString()}</p>
            </div>

            {/* Progress bar gauge */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ${profitData.profit_score > 70 ? 'bg-emerald-500' :
                            profitData.profit_score > 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                    style={{ width: `${profitData.profit_score}%` }}
                ></div>
            </div>
        </div>
    );
};

export default ProfitabilityPanel;
