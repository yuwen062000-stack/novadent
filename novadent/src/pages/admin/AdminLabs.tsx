import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface Lab {
  id: string;
  name: string;
  leadTechnicianName: string;
  phone: string;
  email: string;
  city: string;
  status: string;
}

export function AdminLabs() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Lab | null>(null);
  const [form, setForm] = useState({ name: '', leadTechnicianName: '', phone: '', email: '', city: '', detailedAddress: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    apiFetch(`/labs?${params}&limit=100`)
      .then(r => r.json())
      .then(data => { setLabs(Array.isArray(data) ? data : data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditTarget(null); setForm({ name: '', leadTechnicianName: '', phone: '', email: '', city: '', detailedAddress: '' }); setShowModal(true); };
  const openEdit = (l: Lab) => { setEditTarget(l); setForm({ name: l.name, leadTechnicianName: l.leadTechnicianName, phone: l.phone, email: l.email, city: l.city, detailedAddress: '' }); setShowModal(true); };

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.email || !form.city) return alert('請填入必要欄位');
    setSubmitting(true);
    const url = editTarget ? `/labs/${editTarget.id}` : '/labs';
    const res = await apiFetch(url, {
      method: editTarget ? 'PUT' : 'POST',
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) { setShowModal(false); load(); }
    else { const err = await res.json(); alert(err.message || '操作失敗'); }
  };

  const STATUS_COLORS: Record<string, string> = { ACTIVE: 'bg-green-50 text-green-700', PENDING: 'bg-amber-50 text-amber-700', DISABLED: 'bg-red-50 text-red-700' };
  const STATUS_LABELS: Record<string, string> = { ACTIVE: '已啟用', PENDING: '待審核', DISABLED: '已停用' };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">牙技所管理</h1>
          <p className="text-slate-500 mt-1 text-sm">管理合作牙技所資料</p>
        </div>
        <button onClick={openCreate} className="bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-blue-900 transition-colors">
          <Plus size={18} /> 新增牙技所
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="搜尋牙技所名稱..." className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
        </div>
        <button onClick={load} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 flex items-center gap-2"><RefreshCw size={16} /> 搜尋</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['牙技所名稱', '負責技師', '電話', '城市', '狀態', '操作'].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">載入中...</td></tr>
              : labs.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">無資料</td></tr>
              : labs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{l.name}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{l.leadTechnicianName}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{l.phone}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{l.city}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_COLORS[l.status] || 'bg-slate-50 text-slate-600'}`}>{STATUS_LABELS[l.status] || l.status}</span></td>
                  <td className="px-4 py-3"><button onClick={() => openEdit(l)} className="text-xs font-bold text-slate-500 hover:text-blue-800 transition-colors">編輯</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editTarget ? '編輯牙技所' : '新增牙技所'}</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '牙技所名稱 *', key: 'name', col: 2 },
                { label: '負責技師 *', key: 'leadTechnicianName', col: 1 },
                { label: '城市 *', key: 'city', col: 1 },
                { label: '電話 *', key: 'phone', col: 1 },
                { label: 'Email *', key: 'email', col: 1 },
                { label: '詳細地址', key: 'detailedAddress', col: 2 },
              ].map(f => (
                <div key={f.key} className={f.col === 2 ? 'col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">取消</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-bold hover:bg-blue-900 disabled:opacity-50">{submitting ? '儲存中...' : '儲存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
