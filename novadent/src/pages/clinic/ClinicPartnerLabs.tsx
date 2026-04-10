// ClinicPartnerLabs — 診所端合作牙技所管理
// 列出目前合作牙技所清單，並允許診所自行新增或移除合作關係
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Microscope, Loader2, X } from 'lucide-react';
import { apiFetch } from '../../services/authService';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

interface PartnerLab {
  id: string;       // partner-link id
  labId: string;
  labName: string;
  labCity: string;
  labPhone: string;
  labPhotoUrl?: string;
  createdAt: string;
}

interface LabOption {
  id: string;
  name: string;
  city?: string;
}

export function ClinicPartnerLabs() {
  const [links, setLinks]       = useState<PartnerLab[]>([]);
  const [labs, setLabs]         = useState<LabOption[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]       = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  const load = async () => {
    setLoading(true);
    // 分開載入，避免其中一個失敗導致另一個也拿不到
    try {
      const myRes = await apiFetch('/partner-links/my');
      const myLinks = myRes.ok ? await myRes.json() : [];
      setLinks(Array.isArray(myLinks) ? myLinks : []);
    } catch { setLinks([]); }
    try {
      const labsRes = await apiFetch('/labs');
      const allLabs = labsRes.ok ? await labsRes.json() : [];
      const labList = Array.isArray(allLabs) ? allLabs : allLabs.data ?? [];
      setLabs(labList);
    } catch { setLabs([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // 過濾掉已合作的牙技所，避免重複選擇
  const linkedLabIds = new Set(links.map(l => l.labId));
  const labOptions = labs
    .filter(l => !linkedLabIds.has(l.id))
    .map(l => ({ value: l.id, label: `${l.name}${l.city ? ` — ${l.city}` : ''}` }));

  const handleAdd = async () => {
    if (!selectedLabId) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/partner-links/my', {
        method: 'POST',
        body: JSON.stringify({ labId: selectedLabId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '新增失敗');
      }
      showToast('✅ 合作牙技所已新增');
      setShowModal(false);
      setSelectedLabId('');
      await load();
    } catch (e: any) {
      showToast(`❌ ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (linkId: string, labName: string) => {
    if (!confirm(`確定移除與「${labName}」的合作關係？`)) return;
    try {
      await apiFetch(`/partner-links/my/${linkId}`, { method: 'DELETE' });
      showToast('已移除合作關係');
      await load();
    } catch {
      showToast('❌ 移除失敗');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl">{toast}</div>
      )}

      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Microscope size={22} className="text-blue-900" /> 合作牙技所
          </h1>
          <p className="text-slate-500 text-sm mt-1">管理您診所的合作牙技所</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { setSelectedLabId(''); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            <Plus size={16} /> 新增合作
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-blue-900" size={28} />
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Microscope size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">尚無合作牙技所</p>
          <p className="text-slate-400 text-sm mt-1 mb-5">新增合作牙技所後，才能指派案件</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 transition-colors"
          >
            新增第一間合作牙技所
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <div key={link.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
              {link.labPhotoUrl ? (
                <img src={link.labPhotoUrl} alt={link.labName} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100" />
              ) : (
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Microscope size={20} className="text-blue-700" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{link.labName || link.labId}</p>
                <div className="flex items-center gap-3 mt-0.5 text-sm text-slate-500">
                  {link.labCity && <span>{link.labCity}</span>}
                  {link.labPhone && <span>{link.labPhone}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400">
                  {new Date(link.createdAt).toLocaleDateString('zh-TW')} 建立
                </span>
                <button
                  onClick={() => handleDelete(link.id, link.labName)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增合作 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900">新增合作牙技所</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {labOptions.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">目前平台上所有牙技所均已建立合作關係</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">選擇牙技所 <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={labOptions}
                    value={selectedLabId}
                    onChange={v => setSelectedLabId(v)}
                    placeholder="搜尋牙技所名稱或城市"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!selectedLabId || submitting}
                    className="flex-1 py-3 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    建立合作
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
