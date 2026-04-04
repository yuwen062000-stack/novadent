import React, { useState } from 'react';
import { Send, Bell, Users } from 'lucide-react';
import { apiFetch } from '../../services/authService';

const ROLE_OPTIONS = [
  { value: 'MEMBER', label: '會員' },
  { value: 'CLINIC', label: '診所' },
  { value: 'LAB', label: '牙技所' },
  { value: 'ADMIN', label: '管理員' },
  { value: 'SUPER_ADMIN', label: '超級管理員' },
  { value: 'INSURER', label: '保險業者' },
];

export function AdminNotificationCMS() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent?: number; error?: string } | null>(null);

  const toggleRole = (role: string) => {
    setTargetRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const selectAll = () => {
    setTargetRoles(ROLE_OPTIONS.map(r => r.value));
  };

  const clearAll = () => {
    setTargetRoles([]);
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      alert('請填入標題和內容');
      return;
    }
    if (!confirm(`確定要發送廣播通知嗎？\n\n標題：${title}\n目標：${targetRoles.length === 0 ? '全部用戶' : targetRoles.join(', ')}`)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await apiFetch('/admin/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ sent: data.sent });
        setTitle('');
        setContent('');
        setTargetRoles([]);
      } else {
        setResult({ error: data.message || '發送失敗' });
      }
    } catch (e: any) {
      setResult({ error: e.message || '發送失敗' });
    }
    setSending(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">通知廣播</h1>
      </div>

      {result && (
        <div className={`mb-4 p-4 rounded-lg text-sm ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {result.error ? `❌ ${result.error}` : `✅ 成功發送 ${result.sent} 則通知`}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">通知標題</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="輸入通知標題"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">通知內容</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="輸入通知內容"
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Users size={16} />
              目標角色
              <span className="text-gray-400 font-normal">（不選則發送給全部）</span>
            </label>
            <div className="flex gap-2 text-xs">
              <button onClick={selectAll} className="text-blue-600 hover:underline">全選</button>
              <button onClick={clearAll} className="text-gray-500 hover:underline">清除</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleRole(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  targetRoles.includes(opt.value)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
        >
          <Send size={18} />
          {sending ? '發送中...' : '發送廣播通知'}
        </button>
      </div>
    </div>
  );
}
