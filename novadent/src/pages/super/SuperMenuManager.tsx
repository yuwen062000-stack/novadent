import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../services/authService';
import { MenuManager } from '../../components/shared';

export function SuperMenuManager() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const menuItemsRef = useRef(menuItems);

  const handleMenuChange = useCallback((newItems: any[]) => {
    menuItemsRef.current = newItems;
    setMenuItems(newItems);
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const load = (retryCount = 0) => {
    setLoading(true);
    apiFetch('/admin/menu-config')
      .then(r => {
        if (r.status === 401 && retryCount < 2) {
          setTimeout(() => load(retryCount + 1), 500);
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        const items = Array.isArray(data) ? data : [];
        menuItemsRef.current = items;
        setMenuItems(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await apiFetch('/admin/menu-config', {
      method: 'PUT',
      body: JSON.stringify({ items: menuItemsRef.current }),
    });
    setSaving(false);
    if (res.ok) { showToast('選單設定已儲存', true); load(); }
    else showToast('儲存失敗，請重試', false);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto relative">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-white font-bold shadow-lg transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">選單管理</h1>
          <p className="text-slate-500 mt-1 text-sm">設定各角色可看到的選單項目與順序</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors">
            <RefreshCw size={16} /> 重整
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-blue-900 disabled:opacity-50 transition-colors"
          >
            <Save size={18} /> {saving ? '儲存中...' : '儲存設定'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <MenuManager items={menuItems} onChange={handleMenuChange} />
      )}
    </div>
  );
}
