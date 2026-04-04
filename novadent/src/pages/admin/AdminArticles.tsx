import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Eye, EyeOff, RefreshCw, Trash2, Tag } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface Article { id: string; title: string; category: string; tags?: string[]; published: boolean; createdAt: string; author: string; summary?: string; content?: string; slug?: string; }

export function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Article | null>(null);
  const [form, setForm] = useState({ title: '', category: '假牙百科', summary: '', content: '', author: 'Novadent 編輯部', slug: '', published: false, tags: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch('/admin/articles?limit=100')
      .then(r => r.json())
      .then(data => { setArticles(Array.isArray(data) ? data : data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ title: '', category: '假牙百科', summary: '', content: '', author: 'Novadent 編輯部', slug: '', published: false, tags: '' });
    setShowModal(true);
  };
  const openEdit = (a: Article) => {
    setEditTarget(a);
    setForm({
      title: a.title, category: a.category, summary: a.summary || '', content: a.content || '',
      author: a.author, slug: a.slug || '', published: a.published,
      tags: (a.tags || []).join(', ')
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.content) return alert('請填入標題和內容');
    const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') + '-' + Date.now();
    const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    setSubmitting(true);
    const url = editTarget ? `/admin/articles/${editTarget.id}` : '/admin/articles';
    const res = await apiFetch(url, {
      method: editTarget ? 'PATCH' : 'POST',
      body: JSON.stringify({ ...form, slug, tags: tagsArr }),
    });
    setSubmitting(false);
    if (res.ok) { setShowModal(false); load(); }
    else { const err = await res.json(); alert(err.message || '操作失敗'); }
  };

  const handleTogglePublish = async (a: Article) => {
    if (a.published) {
      await apiFetch(`/admin/articles/${a.id}/unpublish`, { method: 'POST' });
    } else {
      await apiFetch(`/admin/articles/${a.id}/publish`, { method: 'POST' });
    }
    load();
  };

  const handleDelete = async (a: Article) => {
    if (!confirm(`確定要刪除「${a.title}」嗎？此操作無法復原。`)) return;
    setDeleting(a.id);
    try {
      const res = await apiFetch(`/admin/articles/${a.id}`, { method: 'DELETE' });
      if (res.ok) load();
      else alert('刪除失敗');
    } catch { alert('刪除失敗'); }
    finally { setDeleting(null); }
  };

  const CATEGORIES = ['假牙百科', '口腔護理', '診所指南', '最新消息'];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">文章管理</h1>
          <p className="text-slate-500 mt-1 text-sm">管理衛教文章的新增、編輯與發布</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 flex items-center gap-2"><RefreshCw size={16} /> 重整</button>
          <button onClick={openCreate} className="bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-blue-900"><Plus size={18} /> 新增文章</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['標題', '分類', '標籤', '作者', '狀態', '操作'].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">載入中...</td></tr>
              : articles.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">尚無文章</td></tr>
              : articles.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{a.title}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold">{a.category}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(a.tags || []).map((t, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs flex items-center gap-0.5">
                          <Tag size={10} />{t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{a.author}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${a.published ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{a.published ? '已發布' : '草稿'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(a)} className="text-xs font-bold text-slate-500 hover:text-blue-800 flex items-center gap-1 transition-colors"><Edit2 size={12} />編輯</button>
                      <button onClick={() => handleTogglePublish(a)} className="text-xs font-bold text-slate-500 hover:text-blue-800 flex items-center gap-1 transition-colors">
                        {a.published ? <><EyeOff size={12} />取消發布</> : <><Eye size={12} />發布</>}
                      </button>
                      <button onClick={() => handleDelete(a)} disabled={deleting === a.id}
                        className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors disabled:opacity-50">
                        <Trash2 size={12} />{deleting === a.id ? '刪除中...' : '刪除'}
                      </button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editTarget ? '編輯文章' : '新增文章'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">標題 *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">分類</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">作者</label>
                  <input value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">標籤（逗號分隔）</label>
                <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                  placeholder="例如：全瓷冠, 美學牙科, 植牙"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">摘要</label>
                <textarea rows={2} value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">內容 *</label>
                <textarea rows={8} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800 resize-y" placeholder="支援 Markdown 語法..." />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.published} onChange={e => setForm(p => ({ ...p, published: e.target.checked }))} className="w-4 h-4 accent-blue-800" />
                <span className="text-sm font-medium text-slate-700">立即發布</span>
              </label>
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
