import React, { useState, useEffect } from 'react';
import { Image, Upload, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface SiteImage {
  id: string;
  page: string;
  position: string;
  imageUrl: string | null;
  altText: string | null;
  sortOrder: number;
}

const POSITION_LABELS: Record<string, string> = {
  HERO: '主視覺 Banner',
  CHALLENGE: '挑戰區塊',
  ABOUT_1: '關於我們 1',
  ABOUT_2: '關於我們 2',
  ABOUT_3: '關於我們 3',
  ABOUT_4: '關於我們 4',
  ABOUT_5: '關於我們 5',
  ABOUT_6: '關於我們 6',
  ABOUT_7: '關於我們 7',
  ABOUT_8: '關於我們 8',
};

export function AdminSiteImages() {
  const [images, setImages] = useState<SiteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'HOME' | 'ABOUT'>('HOME');
  const [uploading, setUploading] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState<{ id: string; value: string } | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch('/site-images')
      .then(r => r.json())
      .then(data => { setImages(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = images.filter(i => i.page === tab);

  const handleUpload = async (img: SiteImage, file: File) => {
    if (file.size > 2 * 1024 * 1024) return alert('檔案大小不可超過 2MB');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return alert('僅支援 JPG / PNG / WebP 格式');

    setUploading(img.id);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploadRes = await apiFetch('/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) { alert('上傳失敗'); return; }
      const { url } = await uploadRes.json();
      await apiFetch(`/admin/site-images/${img.id}`, {
        method: 'PUT',
        body: JSON.stringify({ imageUrl: url }),
      });
      load();
    } catch { alert('上傳失敗'); }
    finally { setUploading(null); }
  };

  const handleSaveAlt = async () => {
    if (!editAlt) return;
    await apiFetch(`/admin/site-images/${editAlt.id}`, {
      method: 'PUT',
      body: JSON.stringify({ altText: editAlt.value }),
    });
    setEditAlt(null);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Image className="w-6 h-6 text-blue-600" /> 圖片管理
        </h1>
        <button onClick={load} className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200">
          <RefreshCw className="w-4 h-4" /> 重整
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['HOME', 'ABOUT'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {t === 'HOME' ? '首頁' : '關於我們'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">載入中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(img => (
            <div key={img.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                {img.imageUrl ? (
                  <img src={img.imageUrl} alt={img.altText || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400 text-center">
                    <Image className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">尚未上傳圖片</p>
                  </div>
                )}
                {uploading === img.id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{POSITION_LABELS[img.position] || img.position}</span>
                  <span className="text-xs text-gray-400">{img.position}</span>
                </div>
                {editAlt?.id === img.id ? (
                  <div className="flex gap-2 mb-3">
                    <input value={editAlt.value} onChange={e => setEditAlt({ ...editAlt, value: e.target.value })}
                      className="flex-1 px-2 py-1 text-sm border rounded" placeholder="替代文字" />
                    <button onClick={handleSaveAlt} className="text-xs px-2 py-1 bg-blue-600 text-white rounded">儲存</button>
                    <button onClick={() => setEditAlt(null)} className="text-xs px-2 py-1 bg-gray-200 rounded">取消</button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mb-3 cursor-pointer hover:text-blue-600"
                    onClick={() => setEditAlt({ id: img.id, value: img.altText || '' })}>
                    Alt: {img.altText || '（點擊編輯）'}
                  </p>
                )}
                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-sm">
                  <Upload className="w-4 h-4" />
                  {img.imageUrl ? '更換圖片' : '上傳圖片'}
                  <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp"
                    onChange={e => { if (e.target.files?.[0]) handleUpload(img, e.target.files[0]); e.target.value = ''; }} />
                </label>
                <p className="text-xs text-gray-400 mt-2 text-center">建議 JPG/PNG，最大 2MB</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
