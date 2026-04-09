import React, { useState, useEffect } from 'react';
import { Video, Plus, Edit2, Trash2, Eye, EyeOff, Star, StarOff, RefreshCw, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface VideoItem {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  featuredOnHome: boolean;
  isPublished: boolean;
  sortOrder: number;
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function AdminVideos() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<VideoItem | null>(null);
  const [form, setForm] = useState({ title: '', videoUrl: '', description: '', featuredOnHome: false });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch('/admin/videos')
      .then(r => r.json())
      .then(data => { setVideos(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ title: '', videoUrl: '', description: '', featuredOnHome: false });
    setShowModal(true);
  };

  const openEdit = (v: VideoItem) => {
    setEditTarget(v);
    setForm({ title: v.title, videoUrl: v.videoUrl, description: v.description || '', featuredOnHome: v.featuredOnHome });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.videoUrl) return alert('請填入標題和 YouTube 連結');
    if (!extractYoutubeId(form.videoUrl)) return alert('請輸入有效的 YouTube 連結');

    const ytId = extractYoutubeId(form.videoUrl);
    const thumbnailUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined;

    setSubmitting(true);
    const url = editTarget ? `/admin/videos/${editTarget.id}` : '/admin/videos';
    const method = editTarget ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify({ ...form, thumbnailUrl }) });
    setSubmitting(false);
    if (res.ok) { setShowModal(false); load(); }
    else { const err = await res.json(); alert(err.message || '操作失敗'); }
  };

  const handleTogglePublish = async (id: string) => {
    await apiFetch(`/admin/videos/${id}/toggle-publish`, { method: 'PATCH' });
    load();
  };

  const handleToggleFeatured = async (id: string) => {
    await apiFetch(`/admin/videos/${id}/toggle-featured`, { method: 'PATCH' });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此影片嗎？')) return;
    await apiFetch(`/admin/videos/${id}`, { method: 'DELETE' });
    load();
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const idx = videos.findIndex(v => v.id === id);
    if (direction === 'up' && idx > 0) {
      await apiFetch(`/admin/videos/${id}`, { method: 'PUT', body: JSON.stringify({ sortOrder: videos[idx - 1].sortOrder }) });
      await apiFetch(`/admin/videos/${videos[idx - 1].id}`, { method: 'PUT', body: JSON.stringify({ sortOrder: videos[idx].sortOrder }) });
    } else if (direction === 'down' && idx < videos.length - 1) {
      await apiFetch(`/admin/videos/${id}`, { method: 'PUT', body: JSON.stringify({ sortOrder: videos[idx + 1].sortOrder }) });
      await apiFetch(`/admin/videos/${videos[idx + 1].id}`, { method: 'PUT', body: JSON.stringify({ sortOrder: videos[idx].sortOrder }) });
    }
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Video className="w-6 h-6 text-blue-600" /> 影音管理
        </h1>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200">
            <RefreshCw className="w-4 h-4" /> 重整
          </button>
          <button onClick={openCreate} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 新增影片
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">載入中...</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">尚無影片，請新增</div>
      ) : (
        <div className="space-y-4">
          {videos.map((v, idx) => {
            const ytId = extractYoutubeId(v.videoUrl);
            return (
              <div key={v.id} className="bg-white rounded-xl border shadow-sm p-4 flex gap-4">
                <div className="w-48 h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {ytId ? (
                    <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={v.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><Video className="w-8 h-8" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800 truncate">{v.title}</h3>
                      {v.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{v.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button onClick={() => handleReorder(v.id, 'up')} disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                      <button onClick={() => handleReorder(v.id, 'down')} disabled={idx === videos.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${v.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {v.isPublished ? '已發布' : '未發布'}
                    </span>
                    {v.featuredOnHome && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">
                        <Star className="w-3 h-3" /> 首頁精選
                      </span>
                    )}
                    {ytId && (
                      <a href={v.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> YouTube
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => openEdit(v)} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                      <Edit2 className="w-3 h-3 inline mr-1" />編輯
                    </button>
                    <button onClick={() => handleTogglePublish(v.id)} className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100">
                      {v.isPublished ? '下架' : '上架'}
                    </button>
                    <button onClick={() => handleToggleFeatured(v.id)} className="px-2 py-1 text-xs bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100">
                      {v.featuredOnHome ? <><StarOff className="w-3 h-3 inline mr-1" />取消精選</> : <><Star className="w-3 h-3 inline mr-1" />設為精選</>}
                    </button>
                    <button onClick={() => handleDelete(v.id)} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">
                      <Trash2 className="w-3 h-3 inline mr-1" />刪除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editTarget ? '編輯影片' : '新增影片'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">標題 <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="影片標題" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">YouTube 連結 <span className="text-red-500">*</span></label>
                <input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="https://www.youtube.com/watch?v=..." />
                {form.videoUrl && extractYoutubeId(form.videoUrl) && (
                  <div className="mt-2 aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <iframe src={`https://www.youtube.com/embed/${extractYoutubeId(form.videoUrl)}`}
                      className="w-full h-full" allowFullScreen title="preview" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">說明文字</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="影片說明（選填）" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.featuredOnHome} onChange={e => setForm({ ...form, featuredOnHome: e.target.checked })}
                  className="rounded" />
                <span className="text-sm">首頁精選</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {submitting ? '處理中...' : (editTarget ? '更新' : '新增')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
