// SuperTagsManager — 診所服務 Tag 管理（SuperAdmin / Admin 使用）
// 功能：新增 / 改名 / 停用 / 刪除 tag；診所可從這個清單點選自己的服務項目
import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Check, X } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface Tag {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export function SuperTagsManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // 新增表單狀態
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  // 編輯狀態（inline）
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = () => {
    setLoading(true);
    apiFetch('/super/tags').then(r => r.json()).then(data => {
      setTags(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── 新增 ────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await apiFetch('/super/tags', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), sortOrder: tags.length }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || '新增失敗');
        return;
      }
      setNewName('');
      load();
    } finally { setAdding(false); }
  };

  // ── 儲存編輯 ────────────────────────────────────────────────
  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await apiFetch(`/super/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    load();
  };

  // ── 切換啟用/停用 ───────────────────────────────────────────
  const handleToggle = async (tag: Tag) => {
    await apiFetch(`/super/tags/${tag.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !tag.isActive }),
    });
    load();
  };

  // ── 刪除 ────────────────────────────────────────────────────
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定刪除「${name}」？`)) return;
    await apiFetch(`/super/tags/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tag 管理</h1>
          <p className="text-slate-500 text-sm mt-1">管理診所可選的服務標籤</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
          <RefreshCw size={18} />
        </button>
      </header>

      {/* 新增 tag */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <p className="text-xs font-bold text-slate-500 mb-2">新增 Tag</p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="輸入 tag 名稱，例：全瓷冠"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="px-4 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-bold hover:bg-blue-900 disabled:opacity-40 flex items-center gap-1.5"
          >
            <Plus size={15} /> 新增
          </button>
        </div>
      </div>

      {/* Tag 清單 */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-900" /></div>
        ) : tags.length === 0 ? (
          <p className="text-center py-12 text-slate-400 text-sm">尚無 Tag，請先新增</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500">Tag 名稱</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500">狀態</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {tags.map(tag => (
                <tr key={tag.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    {editingId === tag.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(tag.id); if (e.key === 'Escape') setEditingId(null); }}
                          autoFocus
                          className="px-3 py-1.5 border border-blue-400 rounded-lg text-sm outline-none w-40"
                        />
                        <button onClick={() => handleSaveEdit(tag.id)} className="text-green-600 hover:text-green-700"><Check size={15} /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
                      </div>
                    ) : (
                      <span className={tag.isActive ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                        {tag.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tag.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {tag.isActive ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}
                        className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1">
                        <Pencil size={12} /> 改名
                      </button>
                      <button onClick={() => handleToggle(tag)}
                        className={`text-xs px-3 py-1.5 border rounded-lg flex items-center gap-1 ${tag.isActive ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                        {tag.isActive ? '停用' : '啟用'}
                      </button>
                      <button onClick={() => handleDelete(tag.id, tag.name)}
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
