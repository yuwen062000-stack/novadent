import React, { useState, useEffect, useCallback } from 'react';
import { Image, Upload, RefreshCw, Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Type, FileText, X, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface SiteImage {
  id: string;
  page: string;
  position: string;
  imageUrl: string | null;
  altText: string | null;
  title: string | null;
  textContent: string | null;
  blockType: string;
  visible: boolean;
  sortOrder: number;
}

export function AdminSiteImages() {
  const [images, setImages] = useState<SiteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'BANNER' | 'BOTTOM' | 'ABOUT'>('BANNER');
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/site-images')
      .then(r => r.json())
      .then(data => { setImages(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { showToast('error', '載入失敗'); setLoading(false); });
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const banners = images.filter(i => i.page === 'HOME' && i.position.startsWith('BANNER')).sort((a, b) => a.sortOrder - b.sortOrder);
  const heroLegacy = images.find(i => i.page === 'HOME' && i.position === 'HERO');
  const allBanners = [...(heroLegacy ? [heroLegacy] : []), ...banners];
  const bottomImage = images.find(i => i.page === 'HOME' && i.position === 'CHALLENGE');
  const aboutBlocks = images.filter(i => i.page === 'ABOUT').sort((a, b) => a.sortOrder - b.sortOrder);

  const handleUpload = async (imgId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) { showToast('error', '檔案大小不可超過 5MB'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('error', '僅支援 JPG / PNG / WebP 格式'); return; }
    setUploading(imgId);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploadRes = await apiFetch('/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '');
        console.error('[SiteImages] Upload failed:', uploadRes.status, errText);
        showToast('error', `上傳失敗 (${uploadRes.status})`);
        return;
      }
      const { url } = await uploadRes.json();
      const updateRes = await apiFetch(`/admin/site-images/${imgId}`, {
        method: 'PUT',
        body: JSON.stringify({ imageUrl: url }),
      });
      if (!updateRes.ok) {
        const errText = await updateRes.text().catch(() => '');
        console.error('[SiteImages] Update failed:', updateRes.status, errText);
        showToast('error', `儲存失敗 (${updateRes.status})`);
        return;
      }
      showToast('success', '上傳成功');
      load();
    } catch (err) {
      console.error('[SiteImages] Upload error:', err);
      showToast('error', '上傳失敗，請檢查網路連線');
    } finally {
      setUploading(null);
    }
  };

  const handleAddBanner = async () => {
    setSaving(true);
    try {
      await apiFetch('/admin/site-images', {
        method: 'POST',
        body: JSON.stringify({ page: 'HOME', position: `BANNER_${Date.now()}`, blockType: 'image' }),
      });
      load();
    } catch { showToast('error', '新增失敗'); }
    finally { setSaving(false); }
  };

  const handleAddAboutBlock = async (blockType: 'image' | 'text') => {
    setSaving(true);
    try {
      await apiFetch('/admin/site-images', {
        method: 'POST',
        body: JSON.stringify({ page: 'ABOUT', position: `ABOUT_${Date.now()}`, blockType, title: '' }),
      });
      load();
    } catch { showToast('error', '新增失敗'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await apiFetch(`/admin/site-images/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        showToast('error', `刪除失敗 (${res.status})`);
        return;
      }
      showToast('success', '已刪除');
      load();
    } catch {
      showToast('error', '刪除失敗');
    }
  };

  const handleToggleVisible = async (img: SiteImage) => {
    try {
      await apiFetch(`/admin/site-images/${img.id}`, {
        method: 'PUT',
        body: JSON.stringify({ visible: !img.visible }),
      });
      load();
    } catch { showToast('error', '操作失敗'); }
  };

  const handleUpdateField = async (id: string, field: string, value: string) => {
    try {
      await apiFetch(`/admin/site-images/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: value }),
      });
      load();
    } catch { showToast('error', '儲存失敗'); }
  };

  const handleMove = async (list: SiteImage[], index: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const items = list.map((item, i) => ({
      id: item.id,
      sortOrder: i === index ? list[swapIdx].sortOrder : i === swapIdx ? list[index].sortOrder : item.sortOrder,
    }));
    try {
      await apiFetch('/admin/site-images/reorder/batch', {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
      load();
    } catch { showToast('error', '排序失敗'); }
  };

  const handleAddBottom = async () => {
    if (bottomImage) return;
    setSaving(true);
    try {
      await apiFetch('/admin/site-images', {
        method: 'POST',
        body: JSON.stringify({ page: 'HOME', position: 'CHALLENGE', blockType: 'image', altText: '首頁下方圖片' }),
      });
      load();
    } catch { showToast('error', '新增失敗'); }
    finally { setSaving(false); }
  };

  const ImageCard = ({ img, showControls, list, index }: { img: SiteImage; showControls?: boolean; list?: SiteImage[]; index?: number }) => (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${!img.visible ? 'opacity-60' : ''}`}>
      <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
        {img.imageUrl ? (
          <img src={img.imageUrl} alt={img.altText || ''} className="w-full h-full object-contain" />
        ) : (
          <div className="text-slate-400 text-center">
            <Image className="w-10 h-10 mx-auto mb-1" />
            <p className="text-xs">尚未上傳</p>
          </div>
        )}
        {uploading === img.id && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        {img.altText !== undefined && (
          <input
            defaultValue={img.altText || ''}
            placeholder="替代文字 (alt)"
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            onBlur={e => { if (e.target.value !== (img.altText || '')) handleUpdateField(img.id, 'altText', e.target.value); }}
          />
        )}
        <div className="flex gap-1.5 flex-wrap">
          <label className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-100 text-xs font-medium">
            <Upload className="w-3.5 h-3.5" />
            {img.imageUrl ? '更換' : '上傳'}
            <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp"
              onChange={e => { if (e.target.files?.[0]) handleUpload(img.id, e.target.files[0]); e.target.value = ''; }} />
          </label>
          {showControls && (
            <>
              <button onClick={() => handleToggleVisible(img)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium ${img.visible ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {img.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              {list && index !== undefined && (
                <>
                  <button onClick={() => handleMove(list, index, 'up')} disabled={index === 0}
                    className="px-1.5 py-1.5 bg-slate-100 rounded-lg text-xs disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleMove(list, index, 'down')} disabled={index === list.length - 1}
                    className="px-1.5 py-1.5 bg-slate-100 rounded-lg text-xs disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                </>
              )}
              <button onClick={() => setDeleteTarget(img.id)}
                className="px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const TextBlockCard = ({ img, list, index }: { img: SiteImage; list: SiteImage[]; index: number }) => (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${!img.visible ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <Type className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-bold text-slate-500">文字區塊</span>
        <div className="flex-1" />
        <button onClick={() => handleToggleVisible(img)}
          className={`px-2 py-1 rounded text-xs ${img.visible ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {img.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        <button onClick={() => handleMove(list, index, 'up')} disabled={index === 0}
          className="px-1 py-1 bg-slate-100 rounded text-xs disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
        <button onClick={() => handleMove(list, index, 'down')} disabled={index === list.length - 1}
          className="px-1 py-1 bg-slate-100 rounded text-xs disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
        <button onClick={() => setDeleteTarget(img.id)}
          className="px-1 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"><Trash2 className="w-3 h-3" /></button>
      </div>
      <input
        defaultValue={img.title || ''}
        placeholder="標題"
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 mb-2 font-medium"
        onBlur={e => { if (e.target.value !== (img.title || '')) handleUpdateField(img.id, 'title', e.target.value); }}
      />
      <textarea
        defaultValue={img.textContent || ''}
        placeholder="內容文字..."
        rows={4}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 resize-y"
        onBlur={e => { if (e.target.value !== (img.textContent || '')) handleUpdateField(img.id, 'textContent', e.target.value); }}
      />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">確定要刪除嗎？</h3>
                <p className="text-sm text-slate-500">此操作無法復原</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">
                取消
              </button>
              <button onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700">
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">圖片管理</h1>
          <p className="text-slate-500 mt-1 text-sm">管理首頁 Banner、底部圖片與關於我們內容</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50">
          <RefreshCw className="w-4 h-4" /> 重整
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'BANNER' as const, label: 'Banner 輪播圖' },
          { key: 'BOTTOM' as const, label: '首頁下方圖' },
          { key: 'ABOUT' as const, label: '關於我們' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${tab === t.key ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'BANNER' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">首頁輪播 Banner，可新增多筆並排序</p>
            <button onClick={handleAddBanner} disabled={saving}
              className="bg-blue-800 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 hover:bg-blue-900 disabled:opacity-50">
              <Plus className="w-4 h-4" /> 新增 Banner
            </button>
          </div>
          {allBanners.length === 0 ? (
            <div className="text-center py-12 text-slate-400">尚無 Banner，點擊「新增 Banner」開始</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allBanners.map((img, i) => (
                <ImageCard key={img.id} img={img} showControls list={allBanners} index={i} />
              ))}
            </div>
          )}
        </div>
      ) : tab === 'BOTTOM' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">首頁下方區塊圖片（單張）</p>
            {!bottomImage && (
              <button onClick={handleAddBottom} disabled={saving}
                className="bg-blue-800 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 hover:bg-blue-900 disabled:opacity-50">
                <Plus className="w-4 h-4" /> 新增圖片
              </button>
            )}
          </div>
          {bottomImage ? (
            <div className="max-w-md">
              <ImageCard img={bottomImage} showControls />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">尚無圖片，點擊「新增圖片」開始</div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">管理「關於我們」頁面內容，可新增圖片或文字區塊，自由排序</p>
            <div className="flex gap-2">
              <button onClick={() => handleAddAboutBlock('image')} disabled={saving}
                className="bg-blue-800 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 hover:bg-blue-900 disabled:opacity-50">
                <Image className="w-4 h-4" /> 新增圖片
              </button>
              <button onClick={() => handleAddAboutBlock('text')} disabled={saving}
                className="bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 hover:bg-slate-800 disabled:opacity-50">
                <FileText className="w-4 h-4" /> 新增文字
              </button>
            </div>
          </div>
          {aboutBlocks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">尚無內容，點擊「新增圖片」或「新增文字」開始</div>
          ) : (
            <div className="space-y-4">
              {aboutBlocks.map((img, i) => (
                img.blockType === 'text' ? (
                  <TextBlockCard key={img.id} img={img} list={aboutBlocks} index={i} />
                ) : (
                  <div key={img.id} className="flex gap-4 items-start">
                    <div className="flex-1">
                      <input
                        defaultValue={img.title || ''}
                        placeholder="標題（選填）"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 mb-2 font-medium"
                        onBlur={e => { if (e.target.value !== (img.title || '')) handleUpdateField(img.id, 'title', e.target.value); }}
                      />
                      <ImageCard img={img} showControls list={aboutBlocks} index={i} />
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
