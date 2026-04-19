// M-01 LoginPage — 登入頁
// 取代原型中 App.tsx 內的 LoginPage function
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput } from '../shared';
import { toast } from '../shared';
import { login, validatePassword } from '../../services/authService';
import { AuthUser, UserRole } from '../../types';

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

/** 各角色登入後導向的路徑 */
function getRedirectPath(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN': return '/admin';
    case 'ADMIN':       return '/admin';
    case 'CLINIC':      return '/clinic';
    case 'LAB':         return '/lab';
    case 'MEMBER':      return '/member';
    case 'INSURER':     return '/insurer/customers';
    default:            return '/';
  }
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!email.trim()) {
      errs.email = '請輸入 Email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Email 格式不正確';
    }
    if (!password) {
      errs.password = '請輸入密碼';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    try {
      const result = await login(email, password);
      if (!result.success || !result.user) {
        setErrors({ form: result.error ?? '登入失敗，請確認帳號密碼' });
        return;
      }
      onLogin(result.user);
      toast.success(`歡迎回來，${result.user.name}`);

      // 強制改密碼
      if (result.user.forceChangePassword) {
        navigate('/force-change-password');
        return;
      }
      navigate(getRedirectPath(result.user.role));
    } catch {
      setErrors({ form: '系統暫時無法連線，請稍後再試' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Novadent</h1>
          <p className="text-sm text-gray-500 mt-1">牙科整合協作平台</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              電子信箱
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              disabled={loading}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
                errors.email ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* 密碼（C-01 PasswordInput） */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              密碼
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              placeholder="請輸入密碼"
              showToggle={true}
              disabled={loading}
              className={errors.password ? 'border-red-400' : ''}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          {/* 整體錯誤訊息 */}
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {errors.form}
            </div>
          )}

          {/* 忘記密碼連結 */}
          <div className="text-right">
            <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
              忘記密碼？
            </Link>
          </div>

          {/* 登入按鈕 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
}
