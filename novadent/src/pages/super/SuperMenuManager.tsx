// SuperMenuManager — 選單管理（雙頁籤：前台公開選單 / 後台登入後選單）
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save, RefreshCw, Eye, EyeOff, ChevronUp, ChevronDown,
  Bookmark, BookmarkCheck, Layers, Globe,
} from 'lucide-react';
import { apiFetch } from '../../services/authService';

// ── 型別定義 ──────────────────────────────────────────────────
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

// ── Toast 元件 ────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-white font-bold shadow-lg ${ok ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}
    </div>
  );
}

// ── 前台選單列（單一公開選單項目）────────────────────────────
function PublicMenuRow({
  item, index, total,
  onMove, onToggleVisible, onToggleFooter, onLabelChange,
}: {
  item: MenuItem; index: number; total: number;
  onMove: (from: number, to: number) => void;
  onToggleVisible: () => void;
  onToggleFooter: () => void;
  onLabelChange: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.label);

  return (
    <div className={`flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm ${!item.visible ? 'opacity-50' : ''}`}>
      {/* 排序 */}
      <div className="flex flex-col gap-0.5">
        <button onClick={() => onMove(index, index - 1)} disabled={index === 0}
          className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronUp size={14} />
        </button>
        <button onClick={() => onMove(index, index + 1)} disabled={index === total - 1}
          className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronDown size={14} />
        </button>
      </div>

      {/* 名稱（可點擊編輯） */}
      <div className="flex-1">
        {editing ? (
          <input
            autoFocus
            className="border border-blue-400 rounded px-2 py-1 text-sm w-full max-w-xs"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { onLabelChange(draft); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onLabelChange(draft); setEditing(false); } }}
          />
        ) : (
          <span
            className="font-medium text-slate-800 cursor-pointer hover:text-blue-600 text-sm"
            onClick={() => setEditing(true)}
            title="點擊編輯名稱"
          >
            {item.label}
          </span>
        )}
        <span className="ml-2 text-xs text-slate-400">{item.path}</span>
      </div>

      {/* 顯示於快速連結 */}
      <button
        onClick={onToggleFooter}
        title={item.showInFooter ? '已顯示於 Footer 快速連結' : '點擊加入 Footer 快速連結'}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
          item.showInFooter ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
        }`}
      >
        {item.showInFooter ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        快速連結
      </button>

      {/* 顯示/隱藏 */}
      <button onClick={onToggleVisible}
        className={`p-1.5 rounded-lg transition-colors ${item.visible ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
        title={item.visible ? '目前顯示，點擊隱藏' : '目前隱藏，點擊顯示'}>
        {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
}

// ── 後台選單列（子項目） ──────────────────────────────────────
function AdminMenuRow({
  item, index, total,
  onMove, onToggleVisible, onLabelChange,
  isChild,
}: {
  item: MenuItem; index: number; total: number;
  onMove: (from: number, to: number) => void;
  onToggleVisible: () => void;
  onLabelChange: (label: string) => void;
  isChild?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.label);

  return (
    <div className={`flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 ${isChild ? 'ml-8 border-l-4 border-l-blue-200' : ''} ${!item.visible ? 'opacity-50' : ''}`}>
      <div className="flex flex-col gap-0.5">
        <button onClick={() => onMove(index, index - 1)} disabled={index === 0}
          className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronUp size={13} />
        </button>
        <button onClick={() => onMove(index, index + 1)} disabled={index === total - 1}
          className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronDown size={13} />
        </button>
      </div>
      <div className="flex-1">
        {editing ? (
          <input
            autoFocus
            className="border border-blue-400 rounded px-2 py-1 text-sm w-full max-w-xs"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { onLabelChange(draft); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onLabelChange(draft); setEditing(false); } }}
          />
        ) : (
          <span
            className="text-sm text-slate-800 cursor-pointer hover:text-blue-600 font-medium"
            onClick={() => setEditing(true)}
            title="點擊編輯名稱"
          >
            {item.label}
          </span>
        )}
        {item.path && <span className="ml-2 text-xs text-slate-400">{item.path}</span>}
      </div>
      <span className="text-xs text-slate-400 hidden sm:block">
        {item.roles.join(', ')}
      </span>
      <button onClick={onToggleVisible}
        className={`p-1.5 rounded-lg transition-colors ${item.visible ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}>
        {item.visible ? <Eye size={15} /> : <EyeOff size={15} />}
      </button>
    </div>
  );
}

// ── 後台選單群組（父層 + 子層） ───────────────────────────────
function AdminGroupBlock({
  parent, children, parentIndex, parentTotal,
  onMoveParent, onToggleParentVisible, onParentLabelChange,
  onMoveChild, onToggleChildVisible, onChildLabelChange,
}: {
  parent: MenuItem; children: MenuItem[]; parentIndex: number; parentTotal: number;
  onMoveParent: (from: number, to: number) => void;
  onToggleParentVisible: () => void;
  onParentLabelChange: (label: string) => void;
  onMoveChild: (parentId: string, from: number, to: number) => void;
  onToggleChildVisible: (childId: string) => void;
  onChildLabelChange: (childId: string, label: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden mb-3">
      {/* 父層標頭 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
        <div className="flex flex-col gap-0.5">
          <button onClick={() => onMoveParent(parentIndex, parentIndex - 1)} disabled={parentIndex === 0}
            className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30">
            <ChevronUp size={13} />
          </button>
          <button onClick={() => onMoveParent(parentIndex, parentIndex + 1)} disabled={parentIndex === parentTotal - 1}
            className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30">
            <ChevronDown size={13} />
          </button>
        </div>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 flex-1">
          <Layers size={15} className="text-blue-600" />
          <span className="font-bold text-slate-700 text-sm">{parent.label}</span>
          <span className="text-xs text-slate-400">（群組，{children.length} 個子項目）</span>
        </button>
        <button onClick={onToggleParentVisible}
          className={`p-1.5 rounded-lg ${parent.visible ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}>
          {parent.visible ? <Eye size={15} /> : <EyeOff size={15} />}
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
              onLabelChange={(label) => onChildLabelChange(child.id!, label)}
            />
          ))}
          {children.length === 0 && (
            <p className="text-xs text-slate-400 pl-8">（此群組目前沒有子項目）</p>
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
  const allItemsRef = useRef(allItems);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

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

  // ── 更新 helpers ──────────────────────────────────────────
  const updateItem = (id: string, patch: Partial<MenuItem>) => {
    const updated = allItemsRef.current.map(i => i.id === id ? { ...i, ...patch } : i);
    allItemsRef.current = updated;
    setAllItems([...updated]);
  };

  // 移動清單內項目（同層順序互換）
  const moveInList = (list: MenuItem[], from: number, to: number): MenuItem[] => {
    if (to < 0 || to >= list.length) return list;
    const arr = [...list];
    [arr[from], arr[to]] = [arr[to], arr[from]];
    return arr.map((item, i) => ({ ...item, order: i }));
  };

  // ── 前台選單操作 ──────────────────────────────────────────
  const publicItems = allItems.filter(i => i.menuType === 'PUBLIC').sort((a, b) => a.order - b.order);

  const handlePublicMove = (from: number, to: number) => {
    const moved = moveInList(publicItems, from, to);
    const rest = allItems.filter(i => i.menuType !== 'PUBLIC');
    const updated = [...rest, ...moved];
    allItemsRef.current = updated;
    setAllItems(updated);
  };

  // ── 後台選單操作 ──────────────────────────────────────────
  // 父群組：有子項目（parentId === 其id）的 ADMIN 頂層項目（無論 path 是否為空）
  const childParentIds = new Set(allItems.filter(i => i.parentId).map(i => i.parentId!));
  const adminParents = allItems.filter(i => i.menuType === 'ADMIN' && !i.parentId && childParentIds.has(i.id!)).sort((a, b) => a.order - b.order);
  // 獨立項目：ADMIN 頂層且不是父群組
  const adminStandalone = allItems.filter(i => i.menuType === 'ADMIN' && !i.parentId && !childParentIds.has(i.id!)).sort((a, b) => a.order - b.order);

  const getChildren = (parentId: string) =>
    allItems.filter(i => i.parentId === parentId).sort((a, b) => a.order - b.order);

  const handleAdminStandaloneMove = (from: number, to: number) => {
    const moved = moveInList(adminStandalone, from, to);
    // 保留非獨立項目（子項目、父群組、PUBLIC 選單）
    const standaloneIds = new Set(adminStandalone.map(i => i.id));
    const rest = allItems.filter(i => !standaloneIds.has(i.id));
    const updated = [...rest, ...moved];
    allItemsRef.current = updated;
    setAllItems(updated);
  };

  const handleParentMove = (from: number, to: number) => {
    const moved = moveInList(adminParents, from, to);
    // 保留非父群組項目
    const parentIds = new Set(adminParents.map(i => i.id));
    const rest = allItems.filter(i => !parentIds.has(i.id));
    const updated = [...rest, ...moved];
    allItemsRef.current = updated;
    setAllItems(updated);
  };

  const handleChildMove = (parentId: string, from: number, to: number) => {
    const children = getChildren(parentId);
    const moved = moveInList(children, from, to);
    const rest = allItems.filter(i => i.parentId !== parentId);
    const updated = [...rest, ...moved];
    allItemsRef.current = updated;
    setAllItems(updated);
  };

  // ── 儲存 ─────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const res = await apiFetch('/admin/menu-config', {
      method: 'PUT',
      body: JSON.stringify({ items: allItemsRef.current }),
    });
    setSaving(false);
    if (res.ok) { showToast('選單設定已儲存', true); load(); }
    else showToast('儲存失敗，請重試', false);
  };

  // ── 渲染 ─────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto relative">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* 標題列 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">選單管理</h1>
          <p className="text-slate-500 mt-1 text-sm">設定各角色可看到的選單項目、順序與名稱</p>
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
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('PUBLIC')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'PUBLIC' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Globe size={15} /> 前台選單（訪客可見）
        </button>
        <button
          onClick={() => setActiveTab('ADMIN')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'ADMIN' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers size={15} /> 後台選單（登入後）
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'PUBLIC' ? (
        /* ── 前台選單頁籤 ── */
        <div>
          <p className="text-xs text-slate-400 mb-3">
            🔵 <b>藍色書籤</b> = 顯示於 Footer「快速連結」；點擊名稱可直接改名；眼睛圖示控制是否在導覽列顯示。
          </p>
          <div className="space-y-2">
            {publicItems.map((item, i) => (
              <PublicMenuRow
                key={item.id ?? i}
                item={item}
                index={i}
                total={publicItems.length}
                onMove={handlePublicMove}
                onToggleVisible={() => updateItem(item.id!, { visible: !item.visible })}
                onToggleFooter={() => updateItem(item.id!, { showInFooter: !item.showInFooter })}
                onLabelChange={label => updateItem(item.id!, { label })}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ── 後台選單頁籤 ── */
        <div>
          <p className="text-xs text-slate-400 mb-3">
            🔷 <b>群組（Layers 圖示）</b> = 可收合的父層；點擊名稱可改名；眼睛圖示控制顯示。
          </p>

          {/* 獨立項目（無群組） */}
          {adminStandalone.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">獨立項目</p>
              <div className="space-y-2">
                {adminStandalone.map((item, i) => (
                  <AdminMenuRow
                    key={item.id ?? i}
                    item={item}
                    index={i}
                    total={adminStandalone.length}
                    onMove={handleAdminStandaloneMove}
                    onToggleVisible={() => updateItem(item.id!, { visible: !item.visible })}
                    onLabelChange={label => updateItem(item.id!, { label })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 父群組區塊 */}
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
                  onParentLabelChange={label => updateItem(parent.id!, { label })}
                  onMoveChild={handleChildMove}
                  onToggleChildVisible={childId => updateItem(childId, { visible: !allItems.find(i => i.id === childId)?.visible })}
                  onChildLabelChange={(childId, label) => updateItem(childId, { label })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
