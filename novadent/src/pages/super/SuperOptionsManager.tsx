// SuperOptionsManager — 系統選項管理（SuperAdmin 使用）
// 管理文章分類、案件類型等可配置項目
import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Check, X } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface Option {
  id: string;
  group: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

// 管理的 group 清單
const GROUPS = [
  { key: 'ARTICLE_CATEGORY', title: '文章分類', desc: '衛教文章的分類選項' },
  { key: 'CASE_TYPE',        title: '案件類型', desc: '建案時可選的假牙類型' },
];

export function SuperOptionsManager() {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState(GROUPS[0].key);

  // 新增表單
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  // 編輯狀態
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editLabel, setEditLabel] = useState('');

  const load = () => {
    setLoading(true);
    apiFetch(`/super/options/${activeGroup}`).then(r => r.json()).then(data => {
      setOptions(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeGroup]);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      const val = newValue.trim() || newLabel.trim(); // value 沒填就跟 label 一樣
      const res = await apiFetch('/super/options', {
        method: 'POST',
        body: JSON.stringify({ group: activeGroup, value: val, label: newLabel.trim(), sortOrder: options.length }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || '新增失敗');
        return;
      }
      setNewValue('');
      setNewLabel('');
      load();
    } finally { setAdding(false); }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editLabel.trim()) return;
    await apiFetch(`/super/options/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ value: editValue.trim() || editLabel.trim(), label: editLabel.trim() }),
    });
    setEditingId(null);
    load();
  };

  const handleToggle = async (opt: Option) => {
    await apiFetch(`/super/options/${opt.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !opt.isActive }),
    });
    load();
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`確定刪除「${label}」？已使用此選項的資料不受影響。`)) return;
    await apiFetch(`/super/options/${id}`, { method: 'DELETE' });
    load();
  };

  const groupInfo = GROUPS.find(g => g.key === activeGroup) ?? GROUPS[0];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">系統選項管理</h1>
          <p className="text-slate-500 text-sm mt-1">管理文章分類、案件類型等系統選項</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
          <RefreshCw size={18} />
        </button>
      </header>

      {/* Group 切換 tab */}
      <div className="flex gap-2 mb-6">
        {GROUPS.map(g => (
          <button key={g.key} onClick={() => setActiveGroup(g.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeGroup === g.key
                ? 'bg-blue-800 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}>
            {g.title}
          </button>
        ))}
      </div>

      {/* 新增選項 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <p className="text-xs font-bold text-slate-500 mb-2">新增{groupInfo.title}</p>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={`輸入${groupInfo.title}名稱`}
            className="flex-1 min-w-[160px] px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800"
          />
          {activeGroup === 'CASE_TYPE' && (
            <input
              value={newValue}
              onChange={e => setNewValue(e.target.value.toUpperCase())}
              placeholder="代碼（如 FIXED）"
              className="w-32 px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800 font-mono"
            />
          )}
          <button onClick={handleAdd} disabled={adding || !newLabel.trim()}
            className="px-4 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-bold hover:bg-blue-900 disabled:opacity-40 flex items-center gap-1.5">
            <Plus size={15} /> 新增
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">{groupInfo.desc}</p>
      </div>

      {/* 選項列表 */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-900" /></div>
        ) : options.length === 0 ? (
          <p className="text-center py-12 text-slate-400 text-sm">尚無{groupInfo.title}，請先新增</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500">名稱</th>
                {activeGroup === 'CASE_TYPE' && <th className="text-left px-4 py-3 text-xs font-bold text-slate-500">代碼</th>}
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">狀態</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {options.map(opt => (
                <tr key={opt.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    {editingId === opt.id ? (
                      <div className="flex gap-2 items-center">
                        <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(opt.id); if (e.key === 'Escape') setEditingId(null); }}
                          autoFocus className="px-3 py-1.5 border border-blue-400 rounded-lg text-sm outline-none w-36" />
                        {activeGroup === 'CASE_TYPE' && (
                          <input value={editValue} onChange={e => setEditValue(e.target.value.toUpperCase())}
                            className="px-3 py-1.5 border border-blue-400 rounded-lg text-sm outline-none w-24 font-mono" />
                        )}
                        <button onClick={() => handleSaveEdit(opt.id)} className="text-green-600 hover:text-green-700"><Check size={15} /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
                      </div>
                    ) : (
                      <span className={opt.isActive ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>{opt.label}</span>
                    )}
                  </td>
                  {activeGroup === 'CASE_TYPE' && (
                    <td className="px-4 py-3.5"><code className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{opt.value}</code></td>
                  )}
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${opt.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {opt.isActive ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditingId(opt.id); setEditLabel(opt.label); setEditValue(opt.value); }}
                        className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1">
                        <Pencil size={12} /> 編輯
                      </button>
                      <button onClick={() => handleToggle(opt)}
                        className={`text-xs px-3 py-1.5 border rounded-lg flex items-center gap-1 ${opt.isActive ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                        {opt.isActive ? '停用' : '啟用'}
                      </button>
                      <button onClick={() => handleDelete(opt.id, opt.label)}
                        className="text-xs px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 text-red-500 flex items-center gap-1">
                        <Trash2 size={12} /> 刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
