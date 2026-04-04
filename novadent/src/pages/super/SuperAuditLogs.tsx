import React, { useState, useEffect } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  ipAddress: string;
  createdAt: string;
  detail?: any;
}

export function SuperAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (search) params.append('action', search);
    apiFetch(`/admin/audit-logs?${params}`)
      .then(r => r.json())
      .then(data => {
        setLogs(data.data || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">稽核日誌</h1>
        <p className="text-slate-500 mt-1 text-sm">查看所有使用者操作記錄</p>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); load(1); } }}
            placeholder="搜尋操作類型（如 LOGIN、CREATE_CASE）..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800"
          />
        </div>
        <button onClick={() => { setPage(1); load(1); }} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 flex items-center gap-2">
          <RefreshCw size={16} /> 搜尋
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['操作', '目標類型', '目標 ID', 'IP 位址', '時間'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">載入中...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">無記錄</td></tr>
              ) : logs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono">{l.action}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{l.targetType || '-'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                    {l.targetId ? l.targetId.slice(0, 8) + '...' : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{l.ipAddress || '-'}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">
                    {new Date(l.createdAt).toLocaleString('zh-TW')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t border-slate-100">
            <button
              onClick={() => { const p = page - 1; setPage(p); load(p); }}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50"
            >上一頁</button>
            <span className="text-sm text-slate-600">第 {page} / {totalPages} 頁（共 {total} 筆）</span>
            <button
              onClick={() => { const p = page + 1; setPage(p); load(p); }}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50"
            >下一頁</button>
          </div>
        )}
      </div>
    </div>
  );
}
