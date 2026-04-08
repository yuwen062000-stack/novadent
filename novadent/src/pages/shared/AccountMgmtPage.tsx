// AccountMgmtPage — 子帳號管理（CLINIC / LAB 共用）
// 功能：列出子帳號、新增、編輯姓名/電話、刪除、重設密碼
import React, { useState, useEffect } from 'react';
import { Plus, Loader2, X, Users, Trash2, Edit2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface SubAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  createdAt: string;
}

interface Props {
  userRole: string; // 'CLINIC' | 'LAB'
}

export function AccountMgmtPage({ userRole }: Props) {
  const [accounts, setAccounts]   = useState<SubAccount[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [toast, setToast]         = useState('');

  // 新增帳號
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating]   = useState(false);
  const [showCreatePw, setShowCreatePw] = useState(false); // 新增子帳號密碼欄位顯示切換

  // 編輯帳號
  const [editingAcc, setEditingAcc] = useState<SubAccount | null>(null);
  const [editForm, setEditForm]   = useState({ name: '', phone: '' });
  const [editError, setEditError] = useState('');
  const [saving, setSaving]       = useState(false);

  // 重設密碼結果
  const [resetResult, setResetResult] = useState<{ accName: string; tempPassword: string } | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  const load = () => {
    apiFetch('/admin/users/me/sub-accounts')
      .then(r => r.json())
      .then(data => {
        setAccounts(Array.isArray(data) ? data : data.data ?? []);
        setLoading(false);
      })
      .catch(() => { setError('無法載入子帳號列表'); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  // ── 新增 ────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    if (!createForm.name.trim()) { setCreateError('請填寫姓名'); return; }
    if (!createForm.email.includes('@')) { setCreateError('Email 格式不正確'); return; }
    if (createForm.password.length < 8) { setCreateError('密碼至少需要 8 個字元'); return; }
    setCreating(true);
    try {
      const res = await apiFetch('/admin/users/me/sub-accounts', {
        method: 'POST',
        body: JSON.stringify({
          name:     createForm.name.trim(),
          email:    createForm.email.trim(),
          phone:    createForm.phone.trim() || undefined,
          password: createForm.password,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '建立失敗');
      }
      const newAcc = await res.json();
      setAccounts(prev => [...prev, newAcc]);
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', phone: '', password: '' });
      showToast('✅ 子帳號已建立');
    } catch (err: any) {
      setCreateError(err.message || '建立失敗，請稍後再試');
    } finally {
      setCreating(false);
    }
  }

  // ── 編輯 ────────────────────────────────────────────────────
  function openEdit(acc: SubAccount) {
    setEditingAcc(acc);
    setEditForm({ name: acc.name, phone: acc.phone || '' });
    setEditError('');
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAcc) return;
    if (!editForm.name.trim()) { setEditError('姓名不得為空'); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`/admin/users/me/sub-accounts/${editingAcc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editForm.name.trim(), phone: editForm.phone.trim() || undefined }),
      });
      if (!res.ok) throw new Error('更新失敗');
      const updated = await res.json();
      setAccounts(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      setEditingAcc(null);
      showToast('✅ 已更新帳號資料');
    } catch (err: any) {
      setEditError(err.message || '更新失敗');
    } finally {
      setSaving(false);
    }
  }

  // ── 刪除 ────────────────────────────────────────────────────
  async function handleDelete(acc: SubAccount) {
    if (!confirm(`確定刪除帳號「${acc.name}」？此操作無法復原。`)) return;
    try {
      await apiFetch(`/admin/users/me/sub-accounts/${acc.id}`, { method: 'DELETE' });
      setAccounts(prev => prev.filter(a => a.id !== acc.id));
      showToast('帳號已刪除');
    } catch {
      showToast('❌ 刪除失敗');
    }
  }

  // ── 重設密碼 ─────────────────────────────────────────────────
  async function handleResetPassword(acc: SubAccount) {
    if (!confirm(`確定重設「${acc.name}」的密碼？登入後需立即修改。`)) return;
    try {
      const res = await apiFetch(`/admin/users/me/sub-accounts/${acc.id}/reset-password`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const { tempPassword } = await res.json();
      setResetResult({ accName: acc.name, tempPassword });
    } catch {
      showToast('❌ 重設密碼失敗');
    }
  }

  const inputCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl">{toast}</div>
      )}

      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={22} className="text-blue-900" /> 帳號管理
          </h1>
          <p className="text-slate-500 text-sm mt-1">管理{userRole === 'CLINIC' ? '診所' : '牙技所'}的子帳號</p>
        </div>
        <button
          onClick={() => { setCreateForm({ name: '', email: '', phone: '', password: '' }); setCreateError(''); setShowCreateModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors shadow-sm"
        >
          <Plus size={16} /> 新增帳號
        </button>
      </header>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">{error}</div>}

      {accounts.length === 0 && !error ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Users size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">尚無子帳號</p>
          <p className="text-slate-400 text-sm mt-1 mb-6">新增帳號，讓團隊成員登入系統</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 transition-colors"
          >新增第一個帳號</button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 font-bold shrink-0">
                {acc.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{acc.name}</p>
                <p className="text-sm text-slate-500">{acc.email}</p>
                {acc.phone && <p className="text-xs text-slate-400">{acc.phone}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  acc.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {acc.status === 'ACTIVE' ? '啟用' : '停用'}
                </span>
                <button
                  onClick={() => openEdit(acc)}
                  title="編輯"
                  className="p-2 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => handleResetPassword(acc)}
                  title="重設密碼"
                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <KeyRound size={15} />
                </button>
                <button
                  onClick={() => handleDelete(acc)}
                  title="刪除"
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增 Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900">新增子帳號</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{createError}</div>}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">姓名 <span className="text-red-500">*</span></label>
                <input type="text" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="輸入姓名" className={inputCls} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} placeholder="輸入 Email" className={inputCls} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">電話</label>
                <input type="tel" value={createForm.phone} onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))} placeholder="輸入電話（選填）" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">初始密碼 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type={showCreatePw ? 'text' : 'password'} value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} placeholder="至少 8 個字元" className={inputCls + ' pr-10'} required minLength={8} />
                  <button type="button" onClick={() => setShowCreatePw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCreatePw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">取消</button>
                <button type="submit" disabled={creating} className="flex-1 py-3 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 disabled:opacity-40 flex items-center justify-center gap-2">
                  {creating && <Loader2 size={14} className="animate-spin" />}建立帳號
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 編輯 Modal */}
      {editingAcc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900">編輯帳號</h3>
              <button onClick={() => setEditingAcc(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{editingAcc.email}</p>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {editError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{editError}</div>}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">姓名 <span className="text-red-500">*</span></label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className={inputCls} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">電話</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="選填" className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingAcc(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">取消</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 disabled:opacity-40 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 重設密碼結果 Modal */}
      {resetResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <KeyRound size={32} className="text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">密碼已重設</h3>
            <p className="text-sm text-slate-500 mb-4">
              「{resetResult.accName}」的臨時密碼如下，請立即抄下並告知本人，登入後系統將要求修改密碼。
            </p>
            <div className="bg-slate-100 rounded-xl py-3 px-4 text-2xl font-mono font-bold text-slate-800 tracking-widest mb-5 select-all">
              {resetResult.tempPassword}
            </div>
            <button
              onClick={() => setResetResult(null)}
              className="w-full py-3 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900"
            >
              確認（已記下臨時密碼）
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
