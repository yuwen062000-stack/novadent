import React, { useState, useEffect } from 'react';
import { Loader2, ChevronRight, Search } from 'lucide-react';
import { apiFetch } from '../../services/authService';
import { CaseStatus, LAB_STATUS_LABELS, STATUS_COLORS, CASE_TYPE_LABELS } from '../../types';

interface CaseItem {
  id: string;
  patientName: string;
  clinicName: string;
  status: CaseStatus;
  type: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
}

interface Props {
  setView: (v: string) => void;
  setSelectedCaseId?: (id: string) => void;
}

export function LabCaseList({ setView, setSelectedCaseId }: Props) {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    apiFetch('/cases/lab')
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

  // Only show cases that involve the lab (ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED)
  const labStatuses = [CaseStatus.ASSIGNED, CaseStatus.ACCEPTED, CaseStatus.IN_PROGRESS, CaseStatus.COMPLETED];
  const filtered = cases
    .filter(c => labStatuses.includes(c.status))
    .filter(c => statusFilter === 'ALL' || c.status === statusFilter)
    .filter(c => !search || c.patientName.toLowerCase().includes(search.toLowerCase()) || c.clinicName.toLowerCase().includes(search.toLowerCase()));

  const pendingCount = cases.filter(c => c.status === CaseStatus.ASSIGNED).length;
  const inProgressCount = cases.filter(c => c.status === CaseStatus.IN_PROGRESS).length;
  const completedCount = cases.filter(c => c.status === CaseStatus.COMPLETED).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">案件管理</h1>
        <p className="text-slate-500 text-sm mt-1">查看並處理指派給本牙技所的案件</p>
      </header>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '待接單', value: pendingCount, color: 'bg-amber-50', textColor: 'text-amber-700', status: CaseStatus.ASSIGNED },
          { label: '製作中', value: inProgressCount, color: 'bg-blue-50', textColor: 'text-blue-700', status: CaseStatus.IN_PROGRESS },
          { label: '已完成', value: completedCount, color: 'bg-green-50', textColor: 'text-green-700', status: CaseStatus.COMPLETED },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(statusFilter === s.status ? 'ALL' : s.status)}
            className={`${s.color} rounded-xl p-4 text-left transition-all hover:opacity-80 ${statusFilter === s.status ? 'ring-2 ring-offset-1 ring-blue-800' : ''}`}
          >
            <p className={`text-2xl font-bold ${s.textColor}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜尋病患或診所名稱..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white"
        >
          <option value="ALL">所有狀態</option>
          {labStatuses.map(s => (
            <option key={s} value={s}>{LAB_STATUS_LABELS[s] ?? s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p>目前沒有{statusFilter !== 'ALL' ? `「${LAB_STATUS_LABELS[statusFilter] ?? statusFilter}」` : ''}的案件</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCaseId?.(c.id);
                setView('LAB_CASE_DETAIL');
              }}
              className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-left hover:shadow-md transition-all hover:border-slate-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status]}`}>
                      {LAB_STATUS_LABELS[c.status] ?? c.status}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                      {CASE_TYPE_LABELS[c.type as keyof typeof CASE_TYPE_LABELS] || c.type}
                    </span>
                    {c.status === CaseStatus.ASSIGNED && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium animate-pulse">
                        需接單
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900">{c.patientName}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">來自：{c.clinicName}</p>
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
