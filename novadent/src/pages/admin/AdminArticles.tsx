import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Eye, EyeOff, RefreshCw, Trash2, Tag, Search } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface Article { id: string; title: string; category: string; tags?: string[]; published: boolean; createdAt: string; author: string; summary?: string; content?: string; slug?: string; coverUrl?: string; }

export function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Article | null>(null);
  const [form, setForm] = useState({ title: '', category: '', summary: '', content: '', author: 'Novadent 編輯部', slug: '', published: false, tags: '', coverUrl: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);   // 封面圖上傳中狀態

  // ── 封面圖上傳 handler ──
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await apiFetch('/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setForm(p => ({ ...p, coverUrl: data.url }));
      } else { alert('封面圖上傳失敗'); }
    } catch { alert('封面圖上傳失敗'); }
    finally { setUploading(false); }
  };
  const [loadError, setLoadError] = useState('');                 // API 載入錯誤訊息（403/網路錯誤等）
  // 從 system_options 動態讀取文章分類（SuperAdmin 在系統選項管理）
  const [categories, setCategories] = useState<string[]>([]);
  // 查詢條件
  const [search, setSearch]             = useState('');           // 關鍵字（標題）
  const [filterCategory, setFilterCategory] = useState('');      // 分類篩選
  const [filterPublished, setFilterPublished] = useState('');    // 上架狀態：'' | 'true' | 'false'

  // 套用查詢條件（客戶端過濾）
  const filtered = useMemo(() => {
    return articles.filter(a => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory && a.category !== filterCategory) return false;
      if (filterPublished !== '' && String(a.published) !== filterPublished) return false;
      return true;
    });
  }, [articles, search, filterCategory, filterPublished]);

  const load = () => {
    setLoading(true);
    setLoadError('');
    // 加 _t 時間戳避免 CDN 快取舊資料（Replit CDN 可能快取 GET 回應）
    apiFetch(`/admin/articles?limit=100&_t=${Date.now()}`)
      .then(r => {
        // 顯示錯誤訊息（403 = 無存取權限，401 = 未登入）
        if (!r.ok) { setLoadError(`載入失敗（HTTP ${r.status}）`); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setArticles(Array.isArray(data) ? data : data.data || []);
        setLoading(false);
      })
      .catch(() => { setLoadError('載入失敗，請重新整理'); setLoading(false); });
  };
  useEffect(() => { load(); }, []);
  // 載入文章分類選項（用 apiFetch 確保帶 JWT，避免 CDN 快取舊回應）
  useEffect(() => {
    apiFetch('/options/ARTICLE_CATEGORY')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const cats = Array.isArray(data) ? data.map((d: any) => d.label || d.value) : [];
        if (cats.length > 0) {
          setCategories(cats);
        }
        // cats.length === 0 時保留 useState 初始值空陣列，下方 select 顯示「無分類」
        // 不 fallback 寫死值，讓管理員知道 DB 資料有問題
      })
      .catch(() => {}); // API 失敗時 categories 保持空陣列，新增表單不預設分類
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ title: '', category: categories[0] || '', summary: '', content: '', author: 'Novadent 編輯部', slug: '', published: false, tags: '' });
    setShowModal(true);
  };
  const openEdit = (a: Article) => {
    setEditTarget(a);
    setForm({
      title: a.title, category: a.category, summary: a.summary || '', content: a.content || '',
      author: a.author, slug: a.slug || '', published: a.published,
      tags: (a.tags || []).join(', '), coverUrl: a.coverUrl || ''
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
      headers: { 'Content-Type': 'application/json' },  // 必須帶 Content-Type，NestJS 才能正確解析 JSON body
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

  // categories 已從 /api/options/ARTICLE_CATEGORY 動態取得（見 useEffect）

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

      {/* 查詢條件列 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜尋標題..."
            className="pl-8 pr-3 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20"
          />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 bg-white">
          <option value="">全部分類</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPublished} onChange={e => setFilterPublished(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 bg-white">
          <option value="">全部狀態</option>
          <option value="true">已發布</option>
          <option value="false">草稿</option>
        </select>
        {(search || filterCategory || filterPublished) && (
          <button onClick={() => { setSearch(''); setFilterCategory(''); setFilterPublished(''); }}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50">
            清除篩選
          </button>
        )}
        <span className="self-center text-xs text-slate-400">共 {filtered.length} 筆</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['標題', '分類', '標籤', '作者', '狀態', '操作'].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">載入中...</td></tr>
              : loadError ? <tr><td colSpan={6} className="text-center py-12 text-red-500">{loadError}</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">{articles.length === 0 ? '尚無文章' : '無符合條件的文章'}</td></tr>
              : filtered.map(a => (
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
                <label className="block text-xs font-bold text-slate-500 mb-1">標題 <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
              </div>
              {/* ── 封面圖上傳區塊 ── */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">封面圖片</label>
                <div className="flex items-center gap-3">
                  {form.coverUrl && <img src={form.coverUrl} alt="封面預覽" className="w-24 h-16 object-cover rounded-lg border border-slate-200" />}
                  <label className={`px-4 py-2 border border-slate-200 rounded-xl text-sm cursor-pointer hover:bg-slate-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploading ? '上傳中...' : form.coverUrl ? '更換圖片' : '選擇圖片'}
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={uploading} />
                  </label>
                  {form.coverUrl && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, coverUrl: '' }))} className="text-xs text-red-500 hover:text-red-600">移除</button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">分類</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
                <label className="block text-xs font-bold text-slate-500 mb-1">內容 <span className="text-red-500">*</span></label>
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
