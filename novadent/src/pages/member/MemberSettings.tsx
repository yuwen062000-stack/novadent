import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, User, Lock, Mail } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  birthday?: string;
  createdAt: string;
}

export function MemberSettings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Password form
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => {
    apiFetch('/auth/me')
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword.length < 8) { setPwError('新密碼至少需要 8 個字元'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('新密碼與確認密碼不一致'); return; }
    setPwSaving(true);
    try {
      const res = await apiFetch('/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '變更失敗');
      }
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('✅ 密碼已成功變更');
    } catch (err: any) {
      setPwError(err.message || '密碼變更失敗，請確認舊密碼是否正確');
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl">
          {toast}
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">個人設定</h1>
        <p className="text-slate-500 text-sm mt-1">查看帳號資訊與變更密碼</p>
      </header>

      {/* Profile Card */}
      {profile && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
            <User size={18} className="text-blue-900" /> 帳號資訊
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="w-14 h-14 bg-blue-950 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0">
                {profile.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-lg">{profile.name}</p>
                <p className="text-sm text-slate-500">{profile.email}</p>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                  {profile.role === 'MEMBER' ? '一般會員' : profile.role}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={14} className="text-slate-400" />
                  <p className="text-xs text-slate-400">電子郵件</p>
                </div>
                <p className="text-sm font-medium text-slate-800">{profile.email}</p>
              </div>
              {profile.birthday && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">生日</p>
                  <p className="text-sm font-medium text-slate-800">{profile.birthday}</p>
                </div>
              )}
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">加入日期</p>
                <p className="text-sm font-medium text-slate-800">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('zh-TW') : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
          <Lock size={18} className="text-blue-900" /> 變更密碼
        </h2>
        <form onSubmit={handleChangePw} className="space-y-4">
          {pwError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{pwError}</div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">目前密碼</label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
              placeholder="輸入目前使用的密碼"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">新密碼</label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
              placeholder="至少 8 個字元"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">確認新密碼</label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="再次輸入新密碼"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
            className="w-full py-3 bg-blue-950 text-white rounded-xl font-medium hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {pwSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            變更密碼
          </button>
        </form>
      </div>
    </div>
  );
}
