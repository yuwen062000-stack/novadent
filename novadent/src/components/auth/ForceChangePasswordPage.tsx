// M-01 ForceChangePasswordPage — 強制修改密碼頁
// 路由：/force-change-password
// 當 admin 代重設密碼後（forceChangePassword=true），使用者登入後強制跳轉至此
// 完成修改前阻擋所有其他路由
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { PasswordInput } from '../shared';
import { toast } from '../shared';
import { changePassword, validatePassword, getCurrentUser } from '../../services/authService';
import { UserRole } from '../../types';

/** 各角色修改完密碼後的導向路徑 */
function getRedirectPath(role: UserRole): string {
  switch (role) {
    case 'ADMIN':  return '/admin';
    case 'CLINIC': return '/clinic';
    case 'LAB':    return '/lab';
    case 'MEMBER': return '/member';
    default:       return '/';
  }
}

export function ForceChangePasswordPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});

  const validate = (): boolean => {
    const errs: typeof errors = {};
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    if (!confirm) {
      errs.confirm = '請再次輸入密碼';
    } else if (password !== confirm) {
      errs.confirm = '兩次輸入的密碼不一致';
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
      const result = await changePassword(password);
      if (!result.success) {
        setErrors({ form: result.error ?? '修改失敗，請稍後再試' });
        return;
      }
      toast.success('密碼已成功修改，歡迎使用 Novadent');
      navigate(getRedirectPath(user?.role ?? 'MEMBER'));
    } catch {
      setErrors({ form: '系統暫時無法連線，請稍後再試' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        {/* 提示圖示 */}
        <div className="flex items-center gap-3 mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <ShieldAlert size={20} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">請先設定新密碼</p>
            <p className="text-xs text-amber-600 mt-0.5">
              管理員已重設您的密碼，請立即修改以保障帳號安全。
              修改完成前無法使用其他功能。
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* 新密碼 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新密碼
            </label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="請輸入新密碼"
              disabled={loading}
              className={errors.password ? 'border-red-400' : ''}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            <p className="text-xs text-gray-400 mt-1">至少 8 碼，需含大小寫英文字母與數字</p>
          </div>

          {/* 確認密碼 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              確認新密碼
            </label>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              placeholder="請再次輸入新密碼"
              disabled={loading}
              className={errors.confirm ? 'border-red-400' : ''}
            />
            {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
          </div>

          {/* 整體錯誤 */}
          {errors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {errors.form}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '儲存中...' : '確認修改密碼'}
          </button>
        </form>
      </div>
    </div>
  );
}
