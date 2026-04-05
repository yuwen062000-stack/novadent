import React, { useState, useEffect } from 'react';
import { Activity, Users, Building2, Microscope, ClipboardList, TrendingUp } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface DashboardStats {
  totalUsers: number;
  totalClinics: number;
  totalLabs: number;
  totalCases: number;
  totalArticles: number;
  monthlyCases: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/admin/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const cards = [
    { label: '帳號總數', value: stats?.totalUsers ?? '-', icon: <Users size={24} className="text-blue-600" />, bg: 'bg-blue-50' },
    { label: '診所數', value: stats?.totalClinics ?? '-', icon: <Building2 size={24} className="text-green-600" />, bg: 'bg-green-50' },
    { label: '牙技所數', value: stats?.totalLabs ?? '-', icon: <Microscope size={24} className="text-purple-600" />, bg: 'bg-purple-50' },
    { label: '案件總數', value: stats?.totalCases ?? '-', icon: <ClipboardList size={24} className="text-orange-600" />, bg: 'bg-orange-50' },
    { label: '文章數', value: stats?.totalArticles ?? '-', icon: <Activity size={24} className="text-pink-600" />, bg: 'bg-pink-50' },
    { label: '本月案件', value: stats?.monthlyCases ?? '-', icon: <TrendingUp size={24} className="text-teal-600" />, bg: 'bg-teal-50' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">統計儀表板</h1>
        <p className="text-slate-500 mt-1 text-sm">系統整體運營概覽</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {cards.map((card, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-4">
              <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center shrink-0`}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
