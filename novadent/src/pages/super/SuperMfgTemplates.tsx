import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface Template {
  id: number;
  name: string;
  description: string;
  orderIndex: number;
  isDefault: boolean;
  isActive: boolean;
}

export function SuperMfgTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: '', description: '', isDefault: true });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch('/mfg-step-templates')
      .then(r => r.json())
      .then(data => { setTemplates(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', description: '', isDefault: true });
    setShowModal(true);
  };

  const openEdit = (t: Template) => {
    setEditTarget(t);
    setForm({ name: t.name, description: t.description || '', isDefault: t.isDefault });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name) return alert('請填入節點名稱');
    setSubmitting(true);
    const url = editTarget ? `/mfg-step-templates/${editTarget.id}` : '/mfg-step-templates';
    const res = await apiFetch(url, {
      method: editTarget ? 'PUT' : 'POST',
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) { setShowModal(false); load(); }
    else { const err = await res.json(); alert(err.message || '操作失敗'); }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('確定停用此節點模板？')) return;
    await apiFetch(`/mfg-step-templates/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">製程節點模板</h1>
          <p className="text-slate-500 mt-1 text-sm">管理案件建立時的預設製程節點</p>
        </div>
        <button onClick={openCreate} className="bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-blue-900 transition-colors">
          <Plus size={18} /> 新增節點
        </button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-slate-400">載入中...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">尚無模板，請新增預設製程節點</div>
        ) : templates.map((t, i) => (
          <div key={t.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 ${!t.isActive ? 'opacity-50' : ''}`}>
            <GripVertical size={20} className="text-slate-300 cursor-grab" />
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-800 font-bold text-sm shrink-0">{i + 1}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-slate-900">{t.name}</p>
                {t.isDefault && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold">預設</span>}
                {!t.isActive && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">已停用</span>}
              </div>
              {t.description && <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>}
            </div>
            {t.isActive && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-800 transition-colors"><Edit2 size={16} /></button>
                <button onClick={() => handleDeactivate(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editTarget ? '編輯節點' : '新增節點'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">節點名稱 *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="如：初印模、試戴、完成交付..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">說明</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800 resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))}
                  className="w-4 h-4 accent-blue-800"
                />
                <span className="text-sm font-medium text-slate-700">設為預設節點（建案時自動加入）</span>
              </label>
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
