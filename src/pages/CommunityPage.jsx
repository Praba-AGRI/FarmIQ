import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Users, AlertTriangle, TrendingUp, ChevronLeft, WifiOff, Bug, Leaf, Send, MessageSquare, Shield, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import marketCommunityService from '../services/marketCommunityService';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

// === MOCK DATA ===
const MOCK_INSIGHTS = {
    nearby_farmers: [
        { farmer_id: 'farmer_001', name: 'Rajesh Kumar', district: 'Coimbatore', village: 'Pollachi', latitude: 10.6622, longitude: 77.0065, crop_current: 'maize', sowing_date: '2024-01-15', expected_harvest_date: '2024-05-15', area_acres: 2.5 },
        { farmer_id: 'farmer_002', name: 'Senthil Nathan', district: 'Coimbatore', village: 'Pollachi', latitude: 10.6650, longitude: 77.0080, crop_current: 'maize', sowing_date: '2024-01-20', expected_harvest_date: '2024-05-20', area_acres: 1.8 },
        { farmer_id: 'farmer_003', name: 'Mani Kandan', district: 'Coimbatore', village: 'Pollachi', latitude: 10.6610, longitude: 77.0040, crop_current: 'maize', sowing_date: '2024-01-10', expected_harvest_date: '2024-05-10', area_acres: 3.2 },
        { farmer_id: 'farmer_004', name: 'Priya Dharshini', district: 'Coimbatore', village: 'Pollachi', latitude: 10.6680, longitude: 77.0100, crop_current: 'wheat', sowing_date: '2024-02-01', expected_harvest_date: '2024-06-01', area_acres: 1.5 },
        { farmer_id: 'farmer_005', name: 'Vijay Kumar', district: 'Coimbatore', village: 'Pollachi', latitude: 10.6590, longitude: 77.0020, crop_current: 'maize', sowing_date: '2024-01-18', expected_harvest_date: '2024-05-18', area_acres: 2.0 },
        { farmer_id: 'farmer_006', name: 'Anitha Devi', district: 'Coimbatore', village: 'Pollachi', latitude: 10.6700, longitude: 77.0120, crop_current: 'tomato', sowing_date: '2024-02-10', expected_harvest_date: '2024-05-10', area_acres: 1.0 },
    ],
    total_count: 6,
    distribution: { crop_distribution: { maize: 66.7, wheat: 16.7, tomato: 16.7 }, dominant_crop: 'maize', oversupply_risk: true },
};

const MOCK_ALERTS = {
    alerts: [
        { farmer_name: 'Rajesh Kumar', village: 'Pollachi', crop: 'maize', pest_alert: null, disease_alert: 'Leaf Blight', severity: 'HIGH', reported_date: '2026-02-25' },
        { farmer_name: 'Senthil Nathan', village: 'Pollachi', crop: 'maize', pest_alert: 'Fall Armyworm', disease_alert: null, severity: 'HIGH', reported_date: '2026-02-26' },
        { farmer_name: 'Priya Dharshini', village: 'Pollachi', crop: 'wheat', pest_alert: 'Aphids', disease_alert: null, severity: 'MODERATE', reported_date: '2026-02-24' },
        { farmer_name: 'Anitha Devi', village: 'Pollachi', crop: 'tomato', pest_alert: null, disease_alert: 'Early Blight', severity: 'MODERATE', reported_date: '2026-02-23' },
    ],
    total: 4,
};

const PEST_REMEDIES = {
    'Fall Armyworm': 'Apply Chlorpyrifos 20 EC or Emamectin Benzoate. Monitor fields at dawn. Burn affected plant parts immediately.',
    'Aphids': 'Spray Neem oil or Imidacloprid 17.8 SL. Encourage natural predators. Remove heavily infested shoots.',
    'Leaf Blight': 'Apply Mancozeb or Carbendazim fungicide. Avoid overhead irrigation. Maintain proper soil drainage.',
    'Early Blight': 'Use Azoxystrobin or Chlorothalonil spray. Remove infected leaves. Ensure adequate plant spacing.',
};

const MOCK_CHAT = [
    { id: 1, author: 'Rajesh Kumar', text: 'Good rainfall this week in Pollachi – expecting good harvest for maize!', timestamp: '2026-02-26T08:15:00', crop: 'maize' },
    { id: 2, author: 'Senthil Nathan', text: 'Found Fall Armyworm in my maize field. Applied Emamectin – much better now. Check your fields!', timestamp: '2026-02-26T09:30:00', crop: 'maize' },
    { id: 3, author: 'Priya Dharshini', text: 'Wheat prices are stable at ₹25/kg. Good time to sell.', timestamp: '2026-02-26T11:00:00', crop: 'wheat' },
    { id: 4, author: 'Anitha Devi', text: 'Tomato prices falling. Be careful selling now – wait a few weeks.', timestamp: '2026-02-26T14:20:00', crop: 'tomato' },
];

const getSeverityColor = (severity) => {
    switch (severity) {
        case 'HIGH': return { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-800', icon: 'text-red-500' };
        case 'MODERATE': return { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800', icon: 'text-amber-500' };
        default: return { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800', icon: 'text-blue-500' };
    }
};

const CROP_COLORS = { maize: '#10B981', wheat: '#F59E0B', tomato: '#EF4444', rice: '#3B82F6', cotton: '#8B5CF6' };

function formatTime(ts) {
    try {
        return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
}

// ── ALERT CARD ──────────────────────────────────────────────────────────────
const AlertCard = ({ alert }) => {
    const [showRemedy, setShowRemedy] = useState(false);
    const col = getSeverityColor(alert.severity);
    const issueKey = alert.pest_alert || alert.disease_alert;
    const remedy = PEST_REMEDIES[issueKey] || 'Consult your local agricultural officer for an accurate diagnosis and treatment plan.';

    return (
        <div className={`rounded-2xl border p-4 space-y-2 ${col.bg} ${col.border}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    {alert.pest_alert ? <Bug className={`w-4 h-4 flex-shrink-0 ${col.icon}`} /> : <Leaf className={`w-4 h-4 flex-shrink-0 ${col.icon}`} />}
                    <div>
                        <p className="text-sm font-bold text-gray-900">{alert.farmer_name} <span className="font-normal text-gray-500 text-xs">— {alert.village}</span></p>
                        <p className="text-xs text-gray-500 capitalize">Crop: <span className="font-semibold">{alert.crop}</span></p>
                    </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${col.badge}`}>{alert.severity}</span>
            </div>
            <p className="text-sm font-semibold text-gray-800">
                {alert.pest_alert ? `🐛 Pest: ${alert.pest_alert}` : `🍃 Disease: ${alert.disease_alert}`}
            </p>
            <p className="text-[10px] text-gray-400">Reported: {alert.reported_date}</p>
            <button
                onClick={() => setShowRemedy(!showRemedy)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-1"
            >
                <Shield className="w-3 h-3" /> {showRemedy ? 'Hide' : 'View'} Remedy & Treatment
            </button>
            {showRemedy && (
                <div className="mt-2 p-3 bg-white rounded-xl border border-emerald-100 text-xs text-gray-700 leading-relaxed">
                    <p className="font-bold text-emerald-700 mb-1">✅ Recommended Treatment:</p>
                    <p>{remedy}</p>
                </div>
            )}
        </div>
    );
};

// ── CHAT ────────────────────────────────────────────────────────────────────
const CommunityChat = ({ currentUser, usingMock }) => {
    const [messages, setMessages] = useState(MOCK_CHAT);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!usingMock) {
            marketCommunityService.getChatMessages()
                .then(d => { if (d.messages?.length) setMessages(d.messages); })
                .catch(() => { });
        }
    }, [usingMock]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const send = async () => {
        if (!input.trim()) return;
        setSending(true);
        const newMsg = {
            id: Date.now(),
            author: currentUser?.name || 'You',
            user_id: currentUser?.user_id,
            text: input.trim(),
            timestamp: new Date().toISOString(),
            crop: '',
        };
        try {
            if (!usingMock) {
                const res = await marketCommunityService.postChatMessage(input.trim());
                setMessages(prev => [...prev, res]);
            } else {
                setMessages(prev => [...prev, newMsg]);
            }
        } catch {
            setMessages(prev => [...prev, newMsg]);
        } finally {
            setInput('');
            setSending(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[480px]">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900">Farmer Community Chat</h3>
                <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{messages.length} messages</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                    const isMe = msg.user_id === currentUser?.user_id || (usingMock && msg.author === currentUser?.name);
                    return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: CROP_COLORS[msg.crop] || '#10B981' }}>
                                {msg.author.charAt(0)}
                            </div>
                            <div className={`max-w-[75%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                {!isMe && <span className="text-[10px] text-gray-500 font-semibold px-1">{msg.author}</span>}
                                <div className={`px-3 py-2 rounded-2xl text-sm leading-snug ${isMe ? 'bg-emerald-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                                    {msg.text}
                                </div>
                                <span className="text-[9px] text-gray-400 px-1">{formatTime(msg.timestamp)}</span>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t border-gray-100 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                    placeholder="Share your farm experience..."
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    disabled={sending}
                />
                <button
                    onClick={send}
                    disabled={sending || !input.trim()}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl disabled:opacity-50 transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
const CommunityPage = () => {
    const { user } = useAuth();
    const [insights, setInsights] = useState(null);
    const [alerts, setAlerts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [usingMock, setUsingMock] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        Promise.all([
            marketCommunityService.getCommunityInsights().catch(() => null),
            marketCommunityService.getCommunityAlerts().catch(() => null),
        ]).then(([insRes, alertRes]) => {
            setInsights(insRes || MOCK_INSIGHTS);
            setAlerts(alertRes || MOCK_ALERTS);
            if (!insRes || !alertRes) setUsingMock(true);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="p-8 flex items-center justify-center gap-3 text-emerald-600 font-medium min-h-screen">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            Loading Community Intelligence...
        </div>
    );

    const chartData = Object.entries(insights.distribution.crop_distribution).map(([name, val]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), value: val,
    }));

    const highAlerts = alerts.alerts.filter(a => a.severity === 'HIGH');
    const TABS = ['overview', 'farmers', 'alerts', 'chat'];

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
                <Link to="/dashboard" className="text-emerald-600 hover:text-emerald-700"><ChevronLeft className="w-5 h-5" /></Link>
                <h1 className="text-2xl font-bold text-gray-800">Community Intelligence</h1>
                {usingMock && (
                    <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full font-medium">
                        <WifiOff className="w-3 h-3" /> Demo Data
                    </span>
                )}
                {highAlerts.length > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-full font-bold animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> {highAlerts.length} HIGH Alerts Active
                    </span>
                )}
            </div>

            {/* Tab Nav */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab === 'alerts' ? `Alerts (${alerts.total})` : tab === 'chat' ? '💬 Chat' : tab}
                    </button>
                ))}
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4">
                            <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><Users size={24} /></div>
                            <div><p className="text-sm text-gray-500 font-medium">Nearby Farmers</p><p className="text-2xl font-bold">{insights.total_count}</p></div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><TrendingUp size={24} /></div>
                            <div><p className="text-sm text-gray-500 font-medium">Most Cultivated</p><p className="text-2xl font-bold capitalize">{insights.distribution.dominant_crop}</p></div>
                        </div>
                        <div className={`bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4 ${insights.distribution.oversupply_risk ? 'border-red-100' : 'border-green-100'}`}>
                            <div className={`p-3 rounded-xl ${insights.distribution.oversupply_risk ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}><AlertTriangle size={24} /></div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Regional Risk</p>
                                <p className={`text-2xl font-bold ${insights.distribution.oversupply_risk ? 'text-red-600' : 'text-green-600'}`}>
                                    {insights.distribution.oversupply_risk ? 'Oversupply' : 'Balanced'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Regional Crop Distribution</h2>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={v => `${v.toFixed(1)}%`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {insights.distribution.oversupply_risk && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <p><strong>Oversupply Alert:</strong> Over 60% of nearby farmers grow <span className="capitalize font-semibold">{insights.distribution.dominant_crop}</span>. Consider a different crop next season.</p>
                                </div>
                            )}
                        </div>

                        {/* Quick Alerts Preview */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-800">Active Pest & Disease Alerts</h2>
                                <button onClick={() => setActiveTab('alerts')} className="text-xs text-emerald-600 font-semibold">View all →</button>
                            </div>
                            {alerts.alerts.slice(0, 3).map((alert, i) => (
                                <AlertCard key={i} alert={alert} />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* FARMERS TAB */}
            {activeTab === 'farmers' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-lg font-semibold text-gray-800">All Nearby Farmers</h2>
                        <span className="ml-auto text-xs text-gray-400">{insights.total_count} farmers within 15 km</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {insights.nearby_farmers.map((farmer, idx) => {
                            const alertEntry = alerts.alerts.find(a => a.farmer_name === farmer.name);
                            const cropColor = CROP_COLORS[farmer.crop_current] || '#9CA3AF';
                            return (
                                <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: cropColor }}>
                                            {farmer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{farmer.name}</p>
                                            <p className="text-xs text-gray-500">{farmer.village} · {farmer.area_acres} acres</p>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold text-white capitalize" style={{ backgroundColor: cropColor }}>
                                            {farmer.crop_current}
                                        </span>
                                        {alertEntry && (
                                            <p className={`text-[10px] font-bold ${alertEntry.severity === 'HIGH' ? 'text-red-600' : 'text-amber-600'}`}>
                                                ⚠ {alertEntry.pest_alert || alertEntry.disease_alert}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-gray-400">Harvest: {farmer.expected_harvest_date}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ALERTS TAB */}
            {activeTab === 'alerts' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        These alerts are reported by nearby farmers in your 15 km radius. Check your crops for similar symptoms and take early action.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {alerts.alerts.map((alert, i) => <AlertCard key={i} alert={alert} />)}
                    </div>
                    {alerts.total === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="font-semibold">No active alerts</p>
                            <p className="text-sm">Your community is healthy!</p>
                        </div>
                    )}
                </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
                <CommunityChat currentUser={user} usingMock={usingMock} />
            )}
        </div>
    );
};

export default CommunityPage;
