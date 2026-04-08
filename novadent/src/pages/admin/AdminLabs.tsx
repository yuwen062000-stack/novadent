// AdminLabs — 牙技所管理後台
// 支援：新增 / 編輯 / 審核 / 停用 / 封面照片上傳 / 服務標籤
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, RefreshCw, CheckCircle2, XCircle, Upload, X, Image, Check } from 'lucide-react';
import { apiFetch } from '../../services/authService';
import { TAIWAN_CITIES } from './AdminClinics';

// 牙技所專長選項：從 clinic_tags 動態讀取（SuperAdmin 在 Tag 管理設定）

interface Lab {
  id: string;
  name: string;
  leadTechnicianName: string;
  phone: string;
  email: string;
  city: string;
  status: string;
  coverPhotoUrl?: string;
  specialties?: string[];
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-slate-500 mb-1">
      {children} <span className="text-red-500">*</span>
    </label>
  );
}
function OptionalLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-500 mb-1">{children}</label>;
}

export function AdminLabs() {
  const [labs, setLabs]             = useState<Lab[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState<Lab | null>(null);
  const [form, setForm]             = useState({
    name: '', leadTechnicianName: '', phone: '', email: '',
    city: '', detailedAddress: '', coverPhotoUrl: '', specialties: [] as string[],
    userId: '', // 關聯的 LAB 帳號 userId（新增時必須填入，用戶管理頁可查詢）
  });
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling]     = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  // 從 clinic_tags 動態讀取（SuperAdmin Tag 管理設定的 tag 清單）
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 載入 tag 清單（公開端點，無需 auth）
  useEffect(() => {
    fetch('/api/tags')
      .then(r => r.json())
      .then(data => setAvailableTags(Array.isArray(data) ? data.map((t: any) => t.name) : []))
      .catch(() => {});
  }, []);

  // 使用 /admin/labs 端點，可取得所有狀態（含 PENDING）的牙技所
  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    apiFetch(`/admin/labs?${params}&limit=100`)
      .then(r => r.json())
      .then(data => { setLabs(Array.isArray(data) ? data : data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', leadTechnicianName: '', phone: '', email: '', city: '', detailedAddress: '', coverPhotoUrl: '', specialties: [], userId: '' });
    setShowModal(true);
  };
  const openEdit = (l: Lab) => {
    setEditTarget(l);
    setForm({ name: l.name, leadTechnicianName: l.leadTechnicianName || '', phone: l.phone, email: l.email || '', city: l.city || '', detailedAddress: '', coverPhotoUrl: l.coverPhotoUrl || '', specialties: l.specialties || [], userId: '' });
    setShowModal(true);
  };

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch('/upload', { method: 'POST', body: formData });
      if (!res.ok) { alert('上傳失敗'); return; }
      const { url } = await res.json();
      setForm(p => ({ ...p, coverPhotoUrl: url }));
    } catch { alert('上傳失敗'); }
    finally { setUploading(false); }
  };

  const toggleSpecialty = (s: string) => {
    setForm(p => ({
      ...p,
      specialties: p.specialties.includes(s) ? p.specialties.filter(x => x !== s) : [...p.specialties, s],
    }));
  };

  // 必填：牙技所名稱、電話
  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) return alert('請填入必要欄位（牙技所名稱、電話）');
    setSubmitting(true);
    const url    = editTarget ? `/admin/labs/${editTarget.id}` : '/admin/labs';
    const method = editTarget ? 'PATCH' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(form) });
    setSubmitting(false);
    if (res.ok) { setShowModal(false); load(); }
    else { const err = await res.json(); alert(err.message || '操作失敗'); }
  };

  const handleToggleStatus = async (l: Lab, newStatus: string) => {
    setToggling(l.id);
    try {
      await apiFetch(`/admin/labs/${l.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      load();
    } catch { alert('操作失敗'); }
    finally { setToggling(null); }
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
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['封面', '牙技所名稱', '負責技師', '電話', '城市', '狀態', '操作'].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">載入中...</td></tr>
              : labs.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">無資料</td></tr>
              : labs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {l.coverPhotoUrl
                      ? <img src={l.coverPhotoUrl} alt={l.name} className="w-12 h-10 object-cover rounded-lg" />
                      : <div className="w-12 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Image size={16} className="text-blue-200" /></div>
                    }
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{l.name}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{l.leadTechnicianName || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{l.phone}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{l.city || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_COLORS[l.status] || 'bg-slate-50 text-slate-600'}`}>{STATUS_LABELS[l.status] || l.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => openEdit(l)} className="text-xs font-bold text-slate-500 hover:text-blue-800 transition-colors">編輯</button>
                      {l.status === 'PENDING' && (
                        <button onClick={() => handleToggleStatus(l, 'ACTIVE')} disabled={toggling === l.id}
                          className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50">
                          <CheckCircle2 size={12} />審核通過
                        </button>
                      )}
                      {l.status === 'ACTIVE' && (
                        <button onClick={() => handleToggleStatus(l, 'DISABLED')} disabled={toggling === l.id}
                          className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-50">
                          <XCircle size={12} />停用
                        </button>
                      )}
                      {l.status === 'DISABLED' && (
                        <button onClick={() => handleToggleStatus(l, 'ACTIVE')} disabled={toggling === l.id}
                          className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1 disabled:opacity-50">
                          <CheckCircle2 size={12} />啟用
                        </button>
                      )}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editTarget ? '編輯牙技所' : '新增牙技所'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              {/* 封面照片 */}
              <div>
                <OptionalLabel>封面照片</OptionalLabel>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-20 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50 shrink-0">
                    {form.coverPhotoUrl
                      ? <img src={form.coverPhotoUrl} alt="封面" className="w-full h-full object-cover" />
                      : <Image size={28} className="text-slate-300" />
                    }
                  </div>
                  <div className="flex-1 space-y-2">
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                      <Upload size={15} />
                      {uploading ? '上傳中...' : '點擊上傳圖片'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); e.target.value = ''; }} />
                    {form.coverPhotoUrl && (
                      <button onClick={() => setForm(p => ({ ...p, coverPhotoUrl: '' }))} className="text-xs text-red-500 hover:text-red-600">清除圖片</button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <RequiredLabel>牙技所名稱</RequiredLabel>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
                </div>
                <div>
                  <OptionalLabel>負責技師</OptionalLabel>
                  <input value={form.leadTechnicianName} onChange={e => setForm(p => ({ ...p, leadTechnicianName: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
                </div>
                <div>
                  <OptionalLabel>城市</OptionalLabel>
                  <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800 bg-white">
                    <option value="">請選擇城市</option>
                    {TAIWAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <RequiredLabel>電話</RequiredLabel>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
                </div>
                <div>
                  <OptionalLabel>Email</OptionalLabel>
                  <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
                </div>
                <div className="col-span-2">
                  <OptionalLabel>詳細地址</OptionalLabel>
                  <input value={form.detailedAddress} onChange={e => setForm(p => ({ ...p, detailedAddress: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
                </div>
                {/* 關聯帳號 ID（新增時才顯示） */}
                {!editTarget && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      關聯牙技所帳號 ID <span className="font-normal text-slate-400">（填入對應的 LAB 帳號 userId，可於「用戶管理」查詢）</span>
                    </label>
                    <input value={form.userId} onChange={e => setForm(p => ({ ...p, userId: e.target.value }))}
                      placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800 font-mono" />
                  </div>
                )}
              </div>

              {/* 專長標籤（多選） */}
              <div>
                <OptionalLabel>專長項目（卡片標籤）</OptionalLabel>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(s => (
                    <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        form.specialties.includes(s)
                          ? 'bg-blue-800 text-white border-blue-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                      }`}>
                      {form.specialties.includes(s) && <Check size={10} className="inline mr-1" />}
                      {s}
                    </button>
                  ))}
                  {availableTags.length === 0 && (
                    <span className="text-xs text-slate-400">尚無 tag，請 SuperAdmin 至進階設定 → Tag 管理新增</span>
                  )}
                </div>
              </div>
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
