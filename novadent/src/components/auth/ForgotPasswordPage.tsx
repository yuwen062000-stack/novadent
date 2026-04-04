// M-01 ForgotPasswordPage — 忘記密碼頁
// 路由：/forgot-password
// 安全設計：無論 email 是否存在，一律顯示「已發送」（防 email 探測攻擊）
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { forgotPassword } from '../../services/authService';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validate = (): boolean => {
    if (!email.trim()) {
      setEmailError('請輸入 Email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Email 格式不正確');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true); // 不論結果都顯示成功（防探測）
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <Link to="/login" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 -mt-1">
          <ArrowLeft size={14} />
          返回登入
        </Link>

        {sent ? (
          /* 發送成功畫面 */
          <div className="text-center py-4">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
            <h2 className="font-semibold text-gray-900 mb-2">重設連結已發送</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              如果 <span className="font-medium">{email}</span> 已在系統中登記，
              您將收到一封包含密碼重設連結的 Email。
              <br />
              連結有效期為 <span className="font-medium">10 分鐘</span>。
            </p>
            <p className="text-xs text-gray-400 mt-4">
              若未收到，請確認垃圾信件夾，或
              <button
                onClick={() => setSent(false)}
                className="text-blue-600 hover:underline ml-1"
              >
                重新發送
              </button>
            </p>
          </div>
        ) : (
          /* 輸入 Email 表單 */
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">忘記密碼</h2>
              <p className="text-sm text-gray-500 mt-1">
                輸入您的帳號 Email，我們將發送重設連結
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  電子信箱
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    disabled={loading}
                    className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${
                      emailError ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                </div>
                {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? '發送中...' : '發送重設連結'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
