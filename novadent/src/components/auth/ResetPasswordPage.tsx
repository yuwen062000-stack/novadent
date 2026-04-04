// M-01 ResetPasswordPage — 重設密碼頁
// 路由：/reset-password?token=xxx
// 驗證：min 8 碼，含大小寫 + 數字，兩次輸入一致
import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { PasswordInput } from '../shared';
import { toast } from '../shared';
import { resetPassword, validatePassword } from '../../services/authService';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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
      const result = await resetPassword(token, password);
      if (!result.success) {
        setErrors({ form: result.error ?? '重設失敗，請重新申請連結' });
        return;
      }
      setDone(true);
      toast.success('密碼已重設成功');
    } catch {
      setErrors({ form: '系統暫時無法連線，請稍後再試' });
    } finally {
      setLoading(false);
    }
  };

  // token 不存在時提示
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-gray-600 mb-4">連結已失效或不存在，請重新申請。</p>
          <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm">
            重新申請重設連結
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        {done ? (
          /* 完成畫面 */
          <div className="text-center py-4">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
            <h2 className="font-semibold text-gray-900 mb-2">密碼重設成功</h2>
            <p className="text-sm text-gray-500 mb-6">請使用新密碼重新登入</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              前往登入
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">設定新密碼</h2>
              <p className="text-xs text-gray-400 mt-1">
                至少 8 碼，需含大小寫英文字母與數字
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* 新密碼 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder="請輸入新密碼"
                  disabled={loading}
                  className={errors.password ? 'border-red-400' : ''}
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              {/* 確認密碼 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">確認密碼</label>
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
                  {errors.form.includes('失效') && (
                    <Link to="/forgot-password" className="block mt-1 text-xs underline">
                      重新申請連結
                    </Link>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? '儲存中...' : '確認重設'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
