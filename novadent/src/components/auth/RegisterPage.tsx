import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { register as authRegister } from '../../services/authService';
import type { AuthUser } from '../../types';

interface RegisterPageProps {
  onSuccess: (user: AuthUser) => void;
}

export function RegisterPage({ onSuccess }: RegisterPageProps) {
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBirthday, setRegBirthday] = useState('');  // 生日（選填，身分比對用）
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAgreed, setRegAgreed] = useState(false);
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleRegister = async () => {
    setRegError('');
    if (!regName.trim()) { setRegError('請輸入姓名'); return; }
    if (!regEmail.trim()) { setRegError('請輸入 Email'); return; }
    if (!regPassword) { setRegError('請設定密碼'); return; }
    if (regPassword.length < 8) { setRegError('密碼至少 8 個字元'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(regPassword)) { setRegError('密碼需含大小寫英文字母與數字'); return; }
    if (!regAgreed) { setRegError('請先同意服務條款'); return; }

    setRegLoading(true);
    const result = await authRegister(regName.trim(), regEmail.trim(), regPassword, regPhone.trim() || undefined, regBirthday || undefined);
    setRegLoading(false);

    if (result.success && result.user) {
      onSuccess(result.user);
    } else {
      setRegError(result.error || '註冊失敗，請稍後再試');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 py-12 md:py-20">
      <div className="max-w-xl w-full bg-white rounded-3xl md:rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-8 md:p-10 text-center bg-blue-950 text-white">
          <div className="w-14 md:w-16 h-14 md:h-16 bg-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg shadow-blue-800/20">
            <UserPlus className="text-white w-7 md:w-8 h-7 md:h-8" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black mb-2">加入 Novadent</h2>
          <p className="text-sm md:text-base text-slate-400">開啟您的透明化醫療旅程</p>
        </div>
        <div className="p-6 md:p-10 space-y-4 md:space-y-6">
          {regError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{regError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">姓名</label>
              <input type="text" placeholder="您的姓名" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-5 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-800 outline-none text-sm md:text-base" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">手機號碼 <span className="text-slate-300 normal-case">(選填)</span></label>
              <input type="tel" placeholder="例：0912345678" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full px-5 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-800 outline-none text-sm md:text-base" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">生日 <span className="text-slate-300 normal-case">(選填，用於身分比對)</span></label>
              <input type="date" value={regBirthday} onChange={e => setRegBirthday(e.target.value)} className="w-full px-5 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-800 outline-none text-sm md:text-base" />
            </div>
            <div></div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Email</label>
            <input type="email" placeholder="example@email.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full px-5 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-800 outline-none text-sm md:text-base" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">設定密碼</label>
            <input type="password" placeholder="••••••••" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="w-full px-5 py-3.5 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-800 outline-none text-sm md:text-base" />
            <p className="text-[10px] text-slate-400">需含大小寫英文字母與數字，至少 8 字元</p>
          </div>
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100">
            <input type="checkbox" checked={regAgreed} onChange={e => setRegAgreed(e.target.checked)} className="mt-1 w-4 h-4 text-blue-800 rounded border-slate-300 focus:ring-blue-800" />
            <p className="text-[10px] md:text-xs text-slate-500 leading-relaxed">我已閱讀並同意 <Link to="/terms" className="text-blue-800 font-bold">服務條款</Link> 與 <Link to="/privacy" className="text-blue-800 font-bold">隱私權政策</Link>，並了解本平台不提供醫療診斷建議。</p>
          </div>
          <button
            onClick={handleRegister}
            disabled={regLoading}
            className="w-full bg-navy-700 text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-950 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {regLoading ? '註冊中...' : '立即註冊'}
          </button>
        </div>
      </div>
    </div>
  );
}
