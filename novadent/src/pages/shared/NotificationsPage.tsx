import React, { useState, useEffect } from 'react';
import { Bell, Loader2, CheckCheck, Circle } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    apiFetch('/api/notifications')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.data ?? data.notifications ?? [];
        setNotifications(list);
        setLoading(false);
      })
      .catch(() => {
        setError('無法載入通知');
        setLoading(false);
      });
  }, []);

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* silent */ }
    setMarkingAll(false);
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell size={22} className="text-blue-900" /> 通知中心
          </h1>
          {unreadCount > 0 && (
            <p className="text-slate-500 text-sm mt-1">您有 <span className="font-semibold text-blue-700">{unreadCount}</span> 則未讀通知</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            {markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            全部標為已讀
          </button>
        )}
      </header>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">{error}</div>}

      {notifications.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">目前沒有通知</p>
          <p className="text-slate-400 text-sm mt-1">有新動態時會在這裡顯示</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map(n => (
          <button
            key={n.id}
            onClick={() => !n.isRead && markRead(n.id)}
            className={`w-full text-left p-5 rounded-2xl border transition-all ${
              n.isRead
                ? 'bg-white border-slate-100 hover:border-slate-200'
                : 'bg-blue-50 border-blue-100 hover:border-blue-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-1">
                {n.isRead
                  ? <Circle size={10} className="text-slate-300" />
                  : <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-400 shrink-0">
                    {new Date(n.createdAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p className={`text-sm mt-1 ${n.isRead ? 'text-slate-400' : 'text-slate-600'}`}>
                  {n.message}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
