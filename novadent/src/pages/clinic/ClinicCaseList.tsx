import React, { useState, useEffect } from 'react';
import { Plus, Loader2, ChevronRight, Search, Filter } from 'lucide-react';
import { apiFetch } from '../../services/authService';
import { CaseStatus, STATUS_LABELS, STATUS_COLORS, CASE_TYPE_LABELS } from '../../types';

interface CaseItem {
  id: string;
  patientName: string;
  clinicName: string;
  labName?: string;
  status: CaseStatus;
  type: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  progress: number;
}

interface Props {
  setView: (v: string) => void;
  setSelectedCaseId?: (id: string) => void;
}

const ALL_STATUSES = Object.values(CaseStatus);

export function ClinicCaseList({ setView, setSelectedCaseId }: Props) {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    apiFetch('/cases/clinic')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.data ?? [];
        setCases(list);
        setLoading(false);
      })
      .catch(() => {
        setError('無法載入案件');
        setLoading(false);
      });
  }, []);

  const filtered = cases.filter(c => {
    const matchSearch = !search || c.patientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const countByStatus = (s: string) => cases.filter(c => c.status === s).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">案件管理</h1>
          <p className="text-slate-500 text-sm mt-1">管理診所的所有假牙案件</p>
        </div>
        <button
          onClick={() => setView('CLINIC_CREATE_CASE')}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors shadow-sm"
        >
          <Plus size={16} /> 新建案件
        </button>
      </header>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '全部', value: cases.length, color: 'bg-slate-50', textColor: 'text-slate-700' },
          { label: '製作中', value: countByStatus(CaseStatus.IN_PROGRESS), color: 'bg-blue-50', textColor: 'text-blue-700' },
          { label: '待指派', value: countByStatus(CaseStatus.CREATED), color: 'bg-amber-50', textColor: 'text-amber-700' },
          { label: '已完成', value: countByStatus(CaseStatus.COMPLETED), color: 'bg-green-50', textColor: 'text-green-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4`}>
            <p className={`text-2xl font-bold ${s.textColor}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜尋病患姓名..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 bg-white"
        >
          <option value="ALL">所有狀態</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p>沒有符合條件的案件</p>
          {cases.length === 0 && (
            <button
              onClick={() => setView('CLINIC_CREATE_CASE')}
              className="mt-4 px-6 py-2.5 bg-blue-950 text-white rounded-xl text-sm hover:bg-blue-900 transition-colors"
            >
              建立第一個案件
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCaseId?.(c.id);
                setView('CLINIC_CASE_DETAIL');
              }}
              className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-left hover:shadow-md transition-all hover:border-slate-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                      {CASE_TYPE_LABELS[c.type as keyof typeof CASE_TYPE_LABELS] || c.type}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{c.patientName}</h3>
                  {c.labName && <p className="text-sm text-slate-500 mt-0.5">牙技所：{c.labName}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{new Date(c.updatedAt).toLocaleDateString('zh-TW')}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-950 rounded-full" style={{ width: `${c.progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{c.progress}%</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
