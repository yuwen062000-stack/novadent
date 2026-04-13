/**
 * 通知中心頁面 — 顯示使用者的所有通知
 * 支援：已讀/未讀狀態、全部標為已讀、自動輪詢新通知
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Loader2, CheckCheck, Circle } from 'lucide-react';
import { apiFetch } from '../../services/authService';

// 後端回傳的欄位名稱：read（非 isRead）、content（非 message）
interface Notification {
  id: string;
  title: string;
  content: string;     // 後端欄位為 content
  read: boolean;       // 後端欄位為 read
  createdAt: string;
  type?: string;
}

// 輪詢間隔（毫秒）— 每 30 秒自動檢查新通知
const POLL_INTERVAL = 30_000;

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 取得通知列表（可重複呼叫）
  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await apiFetch('/notifications');
      const data = await res.json();
      const list: Notification[] = Array.isArray(data) ? data : data.data ?? data.notifications ?? [];
      setNotifications(list);
      setError('');
    } catch {
      setError('無法載入通知');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // 首次載入 + 輪詢
  useEffect(() => {
    fetchNotifications(true);
    // 設定輪詢：每 30 秒自動重新拉取通知
    pollRef.current = setInterval(() => fetchNotifications(false), POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchNotifications]);

  // 標記單筆已讀
  async function markRead(id: string) {
    // 前端先行更新（樂觀更新）
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  }

  // 全部標為已讀
  async function markAllRead() {
    setMarkingAll(true);
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      // API 成功後，前端同步更新所有通知為已讀
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* silent */ }
    setMarkingAll(false);
  }

  // 未讀數量（使用後端欄位 read）
  const unreadCount = notifications.filter(n => !n.read).length;

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
            onClick={() => !n.read && markRead(n.id)}
            className={`w-full text-left p-5 rounded-2xl border transition-all ${
              n.read
                ? 'bg-white border-slate-100 hover:border-slate-200'
                : 'bg-blue-50 border-blue-100 hover:border-blue-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-1">
                {n.read
                  ? <Circle size={10} className="text-slate-300" />
                  : <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.read ? 'text-slate-700' : 'text-slate-900'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-400 shrink-0">
                    {new Date(n.createdAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {/* 後端欄位為 content，非 message */}
                <p className={`text-sm mt-1 ${n.read ? 'text-slate-400' : 'text-slate-600'}`}>
                  {n.content}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
