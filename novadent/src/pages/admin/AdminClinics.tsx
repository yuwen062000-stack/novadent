import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Check } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface Clinic {
  id: string;
  name: string;
  leadDoctorName: string;
  phone: string;
  email: string;
  city: string;
  status: string;
  coverPhotoUrl?: string;
}

export function AdminClinics() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Clinic | null>(null);
  const [form, setForm] = useState({ name: '', leadDoctorName: '', phone: '', email: '', city: '', detailedAddress: '', coverPhotoUrl: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    apiFetch(`/clinics?${params}&limit=100`)
      .then(r => r.json())
      .then(data => { setClinics(Array.isArray(data) ? data : data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditTarget(null); setForm({ name: '', leadDoctorName: '', phone: '', email: '', city: '', detailedAddress: '', coverPhotoUrl: '' }); setShowModal(true); };
  const openEdit = (c: Clinic) => { setEditTarget(c); setForm({ name: c.name, leadDoctorName: c.leadDoctorName, phone: c.phone, email: c.email, city: c.city, detailedAddress: '', coverPhotoUrl: c.coverPhotoUrl || '' }); setShowModal(true); };

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.email || !form.city) return alert('請填入必要欄位');
    setSubmitting(true);
    const url = editTarget ? `/clinics/${editTarget.id}` : '/clinics';
    const method = editTarget ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(form) });
    setSubmitting(false);
    if (res.ok) { setShowModal(false); load(); }
    else { const err = await res.json(); alert(err.message || '操作失敗'); }
  };

  const handleApprove = async (id: string) => {
    await apiFetch(`/clinics/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    load();
  };

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700',
    PENDING: 'bg-amber-50 text-amber-700',
    DISABLED: 'bg-red-50 text-red-700',
  };
  const STATUS_LABELS: Record<string, string> = { ACTIVE: '已啟用', PENDING: '待審核', DISABLED: '已停用' };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">診所管理</h1>
          <p className="text-slate-500 mt-1 text-sm">管理合作診所資料與審核狀態</p>
        </div>
        <button onClick={openCreate} className="bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-blue-900 transition-colors">
          <Plus size={18} /> 新增診所
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="搜尋診所名稱..." className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
        </div>
        <button onClick={load} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 flex items-center gap-2">
          <RefreshCw size={16} /> 搜尋
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['診所名稱', '負責醫師', '電話', '城市', '狀態', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">載入中...</td></tr>
              ) : clinics.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">無資料</td></tr>
              ) : clinics.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{c.leadDoctorName}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{c.city}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_COLORS[c.status] || 'bg-slate-50 text-slate-600'}`}>{STATUS_LABELS[c.status] || c.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {c.status === 'PENDING' && (
                        <button onClick={() => handleApprove(c.id)} className="text-xs font-bold text-green-600 hover:text-green-700 transition-colors flex items-center gap-1"><Check size={12} />審核通過</button>
                      )}
                      <button onClick={() => openEdit(c)} className="text-xs font-bold text-slate-500 hover:text-blue-800 transition-colors">編輯</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editTarget ? '編輯診所' : '新增診所'}</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '診所名稱 *', key: 'name', col: 2 },
                { label: '負責醫師 *', key: 'leadDoctorName', col: 1 },
                { label: '城市 *', key: 'city', col: 1 },
                { label: '電話 *', key: 'phone', col: 1 },
                { label: 'Email *', key: 'email', col: 1 },
                { label: '詳細地址', key: 'detailedAddress', col: 2 },
                { label: '封面照片 URL', key: 'coverPhotoUrl', col: 2 },
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
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-bold hover:bg-blue-900 disabled:opacity-50">
                {submitting ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
