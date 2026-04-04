import React, { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Pencil } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  status: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: '超級管理員', ADMIN: '管理員', CLINIC: '診所', LAB: '牙技所', MEMBER: '會員', INSURER: '保險業者',
};

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [form, setForm] = useState({ name: '', email: '', role: 'CLINIC', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (roleFilter) params.append('role', roleFilter);
    apiFetch(`/users?${params}`)
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return alert('請填入所有欄位');
    setSubmitting(true);
    try {
      const res = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSubmitting(false);
      if (res.ok) {
        const data = await res.json();
        setShowModal(false);
        setForm({ name: '', email: '', role: 'CLINIC', password: '' });
        load();
        if (data.tempPassword) {
          alert(`✅ 帳號建立成功！\n\n臨時密碼（請立即通知用戶）：\n${data.tempPassword}\n\n用戶首次登入需強制修改密碼。`);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`建立失敗（HTTP ${res.status}）：${err.message || '未知錯誤'}`);
      }
    } catch (e: any) {
      setSubmitting(false);
      alert(`無法連線至伺服器：${e.message || '請稍後再試'}`);
    }
  };

  const handleToggleStatus = async (user: User) => {
    await apiFetch(`/users/${user.id}/toggle-status`, { method: 'POST' });
    load();
  };

  const openEditModal = (user: User) => {
    setEditUser(user);
    setEditForm({ name: user.name, phone: user.phone || '' });
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditUser(null);
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`更新失敗：${err.message || '未知錯誤'}`);
      }
    } catch (e: any) {
      alert(`更新失敗：${e.message}`);
    }
    setSubmitting(false);
  };

  const handleResetPwd = async (userId: string) => {
    const newPwd = prompt('輸入新密碼（留空取消）');
    if (!newPwd) return;
    const res = await apiFetch(`/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword: newPwd }),
    });
    if (res.ok) alert('密碼已重設');
    else alert('重設失敗');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">帳號管理</h1>
          <p className="text-slate-500 mt-1 text-sm">管理所有使用者帳號</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-blue-900 transition-colors">
          <Plus size={18} /> 新增帳號
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="搜尋姓名或Email..." className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); }}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800">
          <option value="">所有角色</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={load} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
          <RefreshCw size={16} /> 搜尋
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['姓名', 'Email', '角色', '狀態', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">載入中...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">無資料</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{u.email}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold">{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${u.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {u.status === 'ACTIVE' ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(u)} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                        <Pencil size={12} /> 編輯
                      </button>
                      <span className="text-slate-200">|</span>
                      <button onClick={() => handleToggleStatus(u)} className="text-xs font-bold text-slate-500 hover:text-blue-800 transition-colors">
                        {u.status === 'ACTIVE' ? '停用' : '啟用'}
                      </button>
                      <span className="text-slate-200">|</span>
                      <button onClick={() => handleResetPwd(u.id)} className="text-xs font-bold text-slate-500 hover:text-blue-800 transition-colors">重設密碼</button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">新增帳號</h2>
            <div className="space-y-3">
              {[
                { label: '姓名', key: 'name', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: '初始密碼', key: 'password', type: 'password' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">角色</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800">
                  {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'SUPER_ADMIN').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">取消</button>
              <button onClick={handleCreate} disabled={submitting} className="flex-1 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-bold hover:bg-blue-900 disabled:opacity-50">
                {submitting ? '建立中...' : '建立帳號'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">編輯用戶 — {editUser.email}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">姓名</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">電話</label>
                <input type="text" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowEditModal(false); setEditUser(null); }} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">取消</button>
              <button onClick={handleEdit} disabled={submitting} className="flex-1 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-bold hover:bg-blue-900 disabled:opacity-50">
                {submitting ? '更新中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
