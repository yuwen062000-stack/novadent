import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../services/authService';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

interface PartnerLink { id: string; clinicId: string; labId: string; clinicName?: string; labName?: string; createdAt: string; }
interface ClinicOption { id: string; name: string; }
interface LabOption { id: string; name: string; }

export function AdminPartnerLinks() {
  const [links, setLinks] = useState<PartnerLink[]>([]);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [labs, setLabs] = useState<LabOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ clinicId: '', labId: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [linksRes, clinicsRes, labsRes] = await Promise.all([
      apiFetch('/admin/partner-links').then(r => r.json()),
      apiFetch('/clinics?limit=200').then(r => r.json()),
      apiFetch('/labs?limit=200').then(r => r.json()),
    ]);
    setLinks(Array.isArray(linksRes) ? linksRes : linksRes.data || []);
    setClinics(Array.isArray(clinicsRes) ? clinicsRes : clinicsRes.data || []);
    setLabs(Array.isArray(labsRes) ? labsRes : labsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.clinicId || !form.labId) return alert('請選擇診所和牙技所');
    setSubmitting(true);
    const res = await apiFetch('/admin/partner-links', { method: 'POST', body: JSON.stringify(form) });
    setSubmitting(false);
    if (res.ok) { setShowModal(false); setForm({ clinicId: '', labId: '' }); load(); }
    else { const err = await res.json(); alert(err.message || '建立失敗'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除此合作連結？')) return;
    await apiFetch(`/admin/partner-links/${id}`, { method: 'DELETE' });
    load();
  };

  const getClinicName = (id: string) => clinics.find(c => c.id === id)?.name || id;
  const getLabName = (id: string) => labs.find(l => l.id === id)?.name || id;

  const clinicSelectOptions = clinics.map(c => ({ value: c.id, label: c.name }));
  const labSelectOptions = labs.map(l => ({ value: l.id, label: l.name }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">合作連結管理</h1>
          <p className="text-slate-500 mt-1 text-sm">管理診所與牙技所的合作關係</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 flex items-center gap-2"><RefreshCw size={16} /> 重新整理</button>
          <button onClick={() => setShowModal(true)} className="bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-blue-900"><Plus size={18} /> 新增連結</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['診所', '牙技所', '建立日期', '操作'].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={4} className="text-center py-12 text-slate-400">載入中...</td></tr>
              : links.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-slate-400">尚無合作連結</td></tr>
              : links.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{l.clinicName || getClinicName(l.clinicId)}</td>
                  <td className="px-4 py-3 text-slate-600">{l.labName || getLabName(l.labId)}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{new Date(l.createdAt).toLocaleDateString('zh-TW')}</td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete(l.id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">新增合作連結</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">診所</label>
                <SearchableSelect
                  options={clinicSelectOptions}
                  value={form.clinicId}
                  onChange={v => setForm(p => ({ ...p, clinicId: v }))}
                  placeholder="搜尋並選擇診所"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">牙技所</label>
                <SearchableSelect
                  options={labSelectOptions}
                  value={form.labId}
                  onChange={v => setForm(p => ({ ...p, labId: v }))}
                  placeholder="搜尋並選擇牙技所"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">取消</button>
              <button onClick={handleCreate} disabled={submitting} className="flex-1 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-bold hover:bg-blue-900 disabled:opacity-50">{submitting ? '建立中...' : '建立'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
