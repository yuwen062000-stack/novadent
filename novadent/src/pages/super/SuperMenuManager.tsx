// SuperMenuManager — 選單管理完整版
// 支援：新增 / 刪除 / 改名 / 改路徑 / 排序 / 顯示控制 / Footer 快速連結
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save, RefreshCw, Eye, EyeOff, ChevronUp, ChevronDown,
  Bookmark, BookmarkCheck, Layers, Globe, Plus, Trash2, X, Check,
} from 'lucide-react';
import { apiFetch } from '../../services/authService';

// ── 型別 ─────────────────────────────────────────────────────
interface MenuItem {
  id?: string;
  label: string;
  path: string;
  roles: string[];
  order: number;
  visible: boolean;
  menuType: 'PUBLIC' | 'ADMIN';
  parentId?: string | null;
  showInFooter: boolean;
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-white font-bold shadow-lg text-sm ${ok ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}
    </div>
  );
}

// ── 行內可編輯欄位（名稱 or 路徑）────────────────────────────
function InlineEdit({
  value, onSave, placeholder, mono,
}: { value: string; onSave: (v: string) => void; placeholder?: string; mono?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => { onSave(draft.trim() || value); setEditing(false); };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        placeholder={placeholder}
        className={`border border-blue-400 rounded px-2 py-0.5 text-sm w-full max-w-xs focus:outline-none ${mono ? 'font-mono' : ''}`}
      />
    );
  }
  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      title="點擊編輯"
      className={`cursor-pointer hover:text-blue-600 ${mono ? 'font-mono text-slate-400 text-xs' : 'font-medium text-slate-800 text-sm'}`}
    >
      {value || <span className="text-slate-300 italic">{placeholder}</span>}
    </span>
  );
}

// ── 新增項目 Modal ────────────────────────────────────────────
interface AddModalProps {
  menuType: 'PUBLIC' | 'ADMIN';
  parentGroups: MenuItem[];          // 可選的父群組清單（ADMIN 用）
  onAdd: (item: Omit<MenuItem, 'id' | 'order'>) => void;
  onClose: () => void;
  defaultParentId?: string | null;   // 從群組的「+」按鈕帶入
}
function AddModal({ menuType, parentGroups, onAdd, onClose, defaultParentId }: AddModalProps) {
  const [label, setLabel]           = useState('');
  const [path, setPath]             = useState('');
  const [isGroup, setIsGroup]       = useState(false);
  const [parentId, setParentId]     = useState<string | null>(defaultParentId ?? null);
  const [showInFooter, setShowInFooter] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    // 群組不需要 path；PUBLIC 和 ADMIN 獨立項目需要 path
    const finalPath = isGroup ? '' : path.trim();
    const roles = menuType === 'PUBLIC'
      ? ['GUEST', 'MEMBER', 'CLINIC', 'LAB', 'ADMIN', 'SUPER_ADMIN']
      : ['ADMIN', 'SUPER_ADMIN'];

    onAdd({
      label:       label.trim(),
      path:        finalPath,
      roles,
      visible:     true,
      menuType,
      parentId:    isGroup ? null : parentId,
      showInFooter: menuType === 'PUBLIC' ? showInFooter : false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900">
            {menuType === 'PUBLIC' ? '新增前台選單項目' : isGroup ? '新增後台群組' : '新增後台選單項目'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 前台：選是否為群組（後台才有群組概念） */}
          {menuType === 'ADMIN' && !defaultParentId && (
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={isGroup} onChange={e => setIsGroup(e.target.checked)}
                className="w-4 h-4 rounded" />
              這是「群組」（父層，不需填路徑）
            </label>
          )}

          {/* 名稱 */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">名稱 *</label>
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="例如：關於我們"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
              required
            />
          </div>

          {/* 路徑（非群組時顯示） */}
          {!isGroup && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">路徑 *</label>
              <input
                value={path}
                onChange={e => setPath(e.target.value)}
                placeholder="/about"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
              />
            </div>
          )}

          {/* 後台：選擇父群組（非群組、非來自群組按鈕時） */}
          {menuType === 'ADMIN' && !isGroup && !defaultParentId && parentGroups.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">所屬群組（選填）</label>
              <select
                value={parentId ?? ''}
                onChange={e => setParentId(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20"
              >
                <option value="">（無，獨立項目）</option>
                {parentGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* 前台：Footer 快速連結 */}
          {menuType === 'PUBLIC' && (
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={showInFooter} onChange={e => setShowInFooter(e.target.checked)}
                className="w-4 h-4 rounded" />
              顯示於 Footer 快速連結
            </label>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50">
              取消
            </button>
            <button type="submit" disabled={!label.trim()}
              className="flex-1 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40">
              新增
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 前台選單列 ────────────────────────────────────────────────
function PublicMenuRow({
  item, index, total, onMove, onToggleVisible, onToggleFooter,
  onLabelChange, onPathChange, onDelete,
}: {
  item: MenuItem; index: number; total: number;
  onMove: (from: number, to: number) => void;
  onToggleVisible: () => void;
  onToggleFooter: () => void;
  onLabelChange: (v: string) => void;
  onPathChange: (v: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm ${!item.visible ? 'opacity-50' : ''}`}>
      {/* 排序 */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button onClick={() => onMove(index, index - 1)} disabled={index === 0}
          className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30">
          <ChevronUp size={14} />
        </button>
        <button onClick={() => onMove(index, index + 1)} disabled={index === total - 1}
          className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30">
          <ChevronDown size={14} />
        </button>
      </div>

      {/* 名稱 + 路徑（均可點擊編輯） */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <InlineEdit value={item.label} onSave={onLabelChange} placeholder="選單名稱" />
        <InlineEdit value={item.path} onSave={onPathChange} placeholder="/路徑" mono />
      </div>

      {/* Footer 快速連結 */}
      <button onClick={onToggleFooter} title={item.showInFooter ? '已在 Footer' : '加入 Footer'}
        className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
          item.showInFooter ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
        }`}>
        {item.showInFooter ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        <span className="hidden sm:inline">快速連結</span>
      </button>

      {/* 顯示/隱藏 */}
      <button onClick={onToggleVisible}
        className={`shrink-0 p-1.5 rounded-lg transition-colors ${item.visible ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}>
        {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>

      {/* 刪除 */}
      <button onClick={onDelete}
        className="shrink-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ── 後台獨立列 ────────────────────────────────────────────────
function AdminMenuRow({
  item, index, total, onMove, onToggleVisible,
  onLabelChange, onPathChange, onDelete, isChild,
}: {
  item: MenuItem; index: number; total: number;
  onMove: (from: number, to: number) => void;
  onToggleVisible: () => void;
  onLabelChange: (v: string) => void;
  onPathChange: (v: string) => void;
  onDelete: () => void;
  isChild?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 ${isChild ? 'ml-8 border-l-4 border-l-blue-200' : ''} ${!item.visible ? 'opacity-50' : ''}`}>
      <div className="flex flex-col gap-0.5 shrink-0">
        <button onClick={() => onMove(index, index - 1)} disabled={index === 0}
          className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30">
          <ChevronUp size={13} />
        </button>
        <button onClick={() => onMove(index, index + 1)} disabled={index === total - 1}
          className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30">
          <ChevronDown size={13} />
        </button>
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <InlineEdit value={item.label} onSave={onLabelChange} placeholder="名稱" />
        {item.path && <InlineEdit value={item.path} onSave={onPathChange} placeholder="/路徑" mono />}
      </div>
      <button onClick={onToggleVisible}
        className={`shrink-0 p-1.5 rounded-lg transition-colors ${item.visible ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}>
        {item.visible ? <Eye size={15} /> : <EyeOff size={15} />}
      </button>
      <button onClick={onDelete}
        className="shrink-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ── 後台群組區塊 ──────────────────────────────────────────────
function AdminGroupBlock({
  parent, children, parentIndex, parentTotal,
  onMoveParent, onToggleParentVisible, onParentLabelChange, onDeleteParent,
  onMoveChild, onToggleChildVisible, onChildLabelChange, onChildPathChange, onDeleteChild,
  onAddChild,
}: {
  parent: MenuItem; children: MenuItem[]; parentIndex: number; parentTotal: number;
  onMoveParent: (from: number, to: number) => void;
  onToggleParentVisible: () => void;
  onParentLabelChange: (v: string) => void;
  onDeleteParent: () => void;
  onMoveChild: (parentId: string, from: number, to: number) => void;
  onToggleChildVisible: (childId: string) => void;
  onChildLabelChange: (childId: string, v: string) => void;
  onChildPathChange: (childId: string, v: string) => void;
  onDeleteChild: (childId: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden mb-3">
      {/* 父層標頭 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={() => onMoveParent(parentIndex, parentIndex - 1)} disabled={parentIndex === 0}
            className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30">
            <ChevronUp size={13} />
          </button>
          <button onClick={() => onMoveParent(parentIndex, parentIndex + 1)} disabled={parentIndex === parentTotal - 1}
            className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30">
            <ChevronDown size={13} />
          </button>
        </div>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 flex-1 min-w-0">
          <Layers size={15} className="text-blue-600 shrink-0" />
          <InlineEdit value={parent.label} onSave={onParentLabelChange} placeholder="群組名稱" />
          <span className="text-xs text-slate-400 shrink-0">（{children.length} 個子項目）</span>
        </button>
        {/* 新增子項目 */}
        <button onClick={() => onAddChild(parent.id!)}
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
          <Plus size={12} /> 新增
        </button>
        <button onClick={onToggleParentVisible}
          className={`shrink-0 p-1.5 rounded-lg ${parent.visible ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}>
          {parent.visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button onClick={onDeleteParent}
          className="shrink-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {/* 子層列表 */}
      {open && (
        <div className="p-3 space-y-2">
          {children.map((child, ci) => (
            <AdminMenuRow
              key={child.id ?? ci}
              item={child}
              index={ci}
              total={children.length}
              isChild
              onMove={(f, t) => onMoveChild(parent.id!, f, t)}
              onToggleVisible={() => onToggleChildVisible(child.id!)}
              onLabelChange={v => onChildLabelChange(child.id!, v)}
              onPathChange={v => onChildPathChange(child.id!, v)}
              onDelete={() => onDeleteChild(child.id!)}
            />
          ))}
          {children.length === 0 && (
            <p className="text-xs text-slate-400 pl-8 py-1">（尚無子項目，點擊右上角「新增」）</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────────
export function SuperMenuManager() {
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'PUBLIC' | 'ADMIN'>('PUBLIC');
  // 新增 Modal 狀態：null=關閉，'PUBLIC'/'ADMIN'=開啟對應類型，parentId=從群組按鈕觸發
  const [addModal, setAddModal] = useState<{ type: 'PUBLIC' | 'ADMIN'; parentId?: string | null } | null>(null);
  const allItemsRef = useRef(allItems);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  // ── 載入 ──────────────────────────────────────────────────
  const load = useCallback((retryCount = 0) => {
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
        const items: MenuItem[] = Array.isArray(data) ? data.map((i: any) => ({
          ...i,
          menuType:     i.menuType     ?? i.menu_type     ?? 'PUBLIC',
          parentId:     i.parentId     ?? i.parent_id     ?? null,
          showInFooter: i.showInFooter ?? i.show_in_footer ?? false,
        })) : [];
        allItemsRef.current = items;
        setAllItems(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── 更新單一項目 ─────────────────────────────────────────
  const updateItem = (id: string, patch: Partial<MenuItem>) => {
    const updated = allItemsRef.current.map(i => i.id === id ? { ...i, ...patch } : i);
    allItemsRef.current = updated;
    setAllItems([...updated]);
  };

  // ── 刪除項目（同時刪除其子項目） ─────────────────────────
  const deleteItem = (id: string) => {
    const updated = allItemsRef.current.filter(i => i.id !== id && i.parentId !== id);
    allItemsRef.current = updated;
    setAllItems([...updated]);
  };

  // ── 新增項目 ─────────────────────────────────────────────
  const addItem = (item: Omit<MenuItem, 'id' | 'order'>) => {
    const sameType = allItemsRef.current.filter(i =>
      i.menuType === item.menuType && i.parentId === (item.parentId ?? null)
    );
    const maxOrder = sameType.length > 0 ? Math.max(...sameType.map(i => i.order)) : -1;
    const newItem: MenuItem = {
      ...item,
      id:    `new-${Date.now()}`, // 前端暫時 ID，後端會換成 UUID
      order: maxOrder + 1,
    };
    const updated = [...allItemsRef.current, newItem];
    allItemsRef.current = updated;
    setAllItems(updated);
  };

  // ── 移動清單內項目 ───────────────────────────────────────
  const moveInList = (list: MenuItem[], from: number, to: number): MenuItem[] => {
    if (to < 0 || to >= list.length) return list;
    const arr = [...list];
    [arr[from], arr[to]] = [arr[to], arr[from]];
    return arr.map((item, i) => ({ ...item, order: i }));
  };

  // ── 前台選單操作 ─────────────────────────────────────────
  const publicItems = [...allItems.filter(i => i.menuType === 'PUBLIC')].sort((a, b) => a.order - b.order);

  const handlePublicMove = (from: number, to: number) => {
    const moved = moveInList(publicItems, from, to);
    const rest = allItems.filter(i => i.menuType !== 'PUBLIC');
    const updated = [...rest, ...moved];
    allItemsRef.current = updated;
    setAllItems(updated);
  };

  // ── 後台選單操作 ─────────────────────────────────────────
  const childParentIds = new Set(allItems.filter(i => i.parentId).map(i => i.parentId!));
  const adminParents   = allItems.filter(i => i.menuType === 'ADMIN' && !i.parentId && childParentIds.has(i.id!)).sort((a, b) => a.order - b.order);
  const adminStandalone = allItems.filter(i => i.menuType === 'ADMIN' && !i.parentId && !childParentIds.has(i.id!)).sort((a, b) => a.order - b.order);
  const getChildren = (parentId: string) => allItems.filter(i => i.parentId === parentId).sort((a, b) => a.order - b.order);

  const handleAdminStandaloneMove = (from: number, to: number) => {
    const moved = moveInList(adminStandalone, from, to);
    const standaloneIds = new Set(adminStandalone.map(i => i.id));
    const updated = [...allItems.filter(i => !standaloneIds.has(i.id)), ...moved];
    allItemsRef.current = updated;
    setAllItems(updated);
  };

  const handleParentMove = (from: number, to: number) => {
    const moved = moveInList(adminParents, from, to);
    const parentIds = new Set(adminParents.map(i => i.id));
    const updated = [...allItems.filter(i => !parentIds.has(i.id)), ...moved];
    allItemsRef.current = updated;
    setAllItems(updated);
  };

  const handleChildMove = (parentId: string, from: number, to: number) => {
    const children = getChildren(parentId);
    const moved = moveInList(children, from, to);
    const updated = [...allItems.filter(i => i.parentId !== parentId), ...moved];
    allItemsRef.current = updated;
    setAllItems(updated);
  };

  // ── 儲存（送出時把前端暫時 ID 清空，讓後端重新產生）──────
  const handleSave = async () => {
    setSaving(true);
    // 把暫時 ID（new-xxx）改成 undefined，後端 upsert 時會視為新增
    const itemsToSave = allItemsRef.current.map(i => ({
      ...i,
      id: i.id?.startsWith('new-') ? undefined : i.id,
    }));
    const res = await apiFetch('/admin/menu-config', {
      method: 'PUT',
      body: JSON.stringify({ items: itemsToSave }),
    });
    setSaving(false);
    if (res.ok) {
      showToast('✅ 選單設定已儲存', true);
      load();
      // 通知 App.tsx 重新抓取側邊欄標籤，不需重整頁面即可看到新名稱
      window.dispatchEvent(new Event('menu-config-updated'));
    } else {
      showToast('❌ 儲存失敗，請重試', false);
    }
  };

  // ── 渲染 ─────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto relative">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Modal */}
      {addModal && (
        <AddModal
          menuType={addModal.type}
          parentGroups={adminParents}
          defaultParentId={addModal.parentId}
          onAdd={addItem}
          onClose={() => setAddModal(null)}
        />
      )}

      {/* 標題列 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">選單管理</h1>
          <p className="text-slate-500 mt-1 text-sm">設定導覽列顯示的項目、順序與名稱</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load()} className="px-4 py-2 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 flex items-center gap-2">
            <RefreshCw size={15} /> 重整
          </button>
          <button onClick={handleSave} disabled={saving}
            className="bg-blue-800 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-blue-900 disabled:opacity-50">
            <Save size={16} /> {saving ? '儲存中...' : '儲存設定'}
          </button>
        </div>
      </div>

      {/* 頁籤 */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('PUBLIC')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'PUBLIC' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>
          <Globe size={15} /> 前台選單
        </button>
        <button onClick={() => setActiveTab('ADMIN')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'ADMIN' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>
          <Layers size={15} /> 後台選單
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'PUBLIC' ? (

        /* ── 前台選單 ── */
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400">
              點擊名稱或路徑可直接編輯；眼睛控制顯示；書籤控制 Footer 快速連結
            </p>
            <button onClick={() => setAddModal({ type: 'PUBLIC' })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors">
              <Plus size={15} /> 新增項目
            </button>
          </div>
          <div className="space-y-2">
            {publicItems.map((item, i) => (
              <PublicMenuRow
                key={item.id ?? i}
                item={item} index={i} total={publicItems.length}
                onMove={handlePublicMove}
                onToggleVisible={() => updateItem(item.id!, { visible: !item.visible })}
                onToggleFooter={() => updateItem(item.id!, { showInFooter: !item.showInFooter })}
                onLabelChange={v => updateItem(item.id!, { label: v })}
                onPathChange={v => updateItem(item.id!, { path: v })}
                onDelete={() => deleteItem(item.id!)}
              />
            ))}
            {publicItems.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">尚無前台選單項目</div>
            )}
          </div>
        </div>

      ) : (

        /* ── 後台選單 ── */
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400">
              點擊名稱或路徑可直接編輯；眼睛控制顯示
            </p>
            <div className="flex gap-2">
              <button onClick={() => setAddModal({ type: 'ADMIN' })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors">
                <Plus size={15} /> 新增項目
              </button>
            </div>
          </div>

          {/* 獨立項目 */}
          {adminStandalone.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">獨立項目</p>
              <div className="space-y-2">
                {adminStandalone.map((item, i) => (
                  <AdminMenuRow
                    key={item.id ?? i}
                    item={item} index={i} total={adminStandalone.length}
                    onMove={handleAdminStandaloneMove}
                    onToggleVisible={() => updateItem(item.id!, { visible: !item.visible })}
                    onLabelChange={v => updateItem(item.id!, { label: v })}
                    onPathChange={v => updateItem(item.id!, { path: v })}
                    onDelete={() => deleteItem(item.id!)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 群組 */}
          {adminParents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">群組</p>
              {adminParents.map((parent, pi) => (
                <AdminGroupBlock
                  key={parent.id ?? pi}
                  parent={parent}
                  children={getChildren(parent.id!)}
                  parentIndex={pi}
                  parentTotal={adminParents.length}
                  onMoveParent={handleParentMove}
                  onToggleParentVisible={() => updateItem(parent.id!, { visible: !parent.visible })}
                  onParentLabelChange={v => updateItem(parent.id!, { label: v })}
                  onDeleteParent={() => deleteItem(parent.id!)}
                  onMoveChild={handleChildMove}
                  onToggleChildVisible={childId => updateItem(childId, { visible: !allItems.find(i => i.id === childId)?.visible })}
                  onChildLabelChange={(childId, v) => updateItem(childId, { label: v })}
                  onChildPathChange={(childId, v) => updateItem(childId, { path: v })}
                  onDeleteChild={childId => deleteItem(childId)}
                  onAddChild={parentId => setAddModal({ type: 'ADMIN', parentId })}
                />
              ))}
            </div>
          )}

          {adminStandalone.length === 0 && adminParents.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">尚無後台選單項目</div>
          )}
        </div>
      )}
    </div>
  );
}
