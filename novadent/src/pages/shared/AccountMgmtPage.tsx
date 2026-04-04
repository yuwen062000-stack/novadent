import React, { useState, useEffect } from 'react';
import { Plus, Loader2, X, Users, Trash2 } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface SubAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface Props {
  userRole: string; // 'CLINIC' | 'LAB'
}

const CLINIC_ROLES = ['醫師', '護理師', '行政助理', '前台人員'];
const LAB_ROLES = ['技師', '助理技師', '行政人員'];

export function AccountMgmtPage({ userRole }: Props) {
  const [accounts, setAccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const [form, setForm] = useState({ name: '', email: '', role: '', password: '' });
  const [formError, setFormError] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => {
    apiFetch('/users/me/sub-accounts')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.data ?? [];
        setAccounts(list);
        setLoading(false);
      })
      .catch(() => {
        setError('無法載入子帳號列表');
        setLoading(false);
      });
  }, []);

  function openModal() {
    const roleOptions = userRole === 'CLINIC' ? CLINIC_ROLES : LAB_ROLES;
    setForm({ name: '', email: '', role: roleOptions[0], password: '' });
    setFormError('');
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('請填寫姓名'); return; }
    if (!form.email.includes('@')) { setFormError('Email 格式不正確'); return; }
    if (form.password.length < 8) { setFormError('密碼至少需要 8 個字元'); return; }

    setSaving(true);
    try {
      const res = await apiFetch('/users/me/sub-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          password: form.password,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '建立失敗');
      }
      const newAcc = await res.json();
      setAccounts(prev => [...prev, newAcc]);
      setShowModal(false);
      showToast('✅ 子帳號已建立');
    } catch (err: any) {
      setFormError(err.message || '建立失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  }

  const roleOptions = userRole === 'CLINIC' ? CLINIC_ROLES : LAB_ROLES;

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
          onClick={openModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors shadow-sm"
        >
          <Plus size={16} /> 新增帳號
        </button>
      </header>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">{error}</div>}

      {accounts.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">尚無子帳號</p>
          <p className="text-slate-400 text-sm mt-1 mb-6">新增帳號，讓團隊成員登入系統</p>
          <button
            onClick={openModal}
            className="px-6 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 transition-colors"
          >
            新增第一個帳號
          </button>
        </div>
      )}

      <div className="space-y-3">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 font-bold shrink-0">
              {acc.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900">{acc.name}</p>
              <p className="text-sm text-slate-500">{acc.email}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{acc.role}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                acc.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}>
                {acc.status === 'ACTIVE' ? '啟用' : '停用'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900">新增子帳號</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{formError}</div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">姓名</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="輸入姓名"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="輸入 Email"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">職稱</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 bg-white transition-all"
                >
                  {roleOptions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">初始密碼</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="至少 8 個字元"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all"
                  required
                  minLength={8}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  建立帳號
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
