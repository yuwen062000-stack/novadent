import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Mail, Settings } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface SettingItem {
  id?: string;
  key: string;
  value: string;
  description?: string;
}

const SETTING_GROUPS = [
  {
    label: 'SMTP 郵件設定',
    icon: <Mail size={20} />,
    keys: [
      { key: 'smtp_host', label: 'SMTP 主機', placeholder: 'smtp.gmail.com' },
      { key: 'smtp_port', label: 'SMTP 埠號', placeholder: '587' },
      { key: 'smtp_secure', label: '使用 SSL', placeholder: 'true 或 false' },
      { key: 'smtp_user', label: 'SMTP 帳號', placeholder: 'your-email@gmail.com' },
      { key: 'smtp_pass', label: 'SMTP 密碼', placeholder: '應用程式密碼' },
      { key: 'smtp_from', label: '寄件人', placeholder: 'noreply@novadent.com' },
    ],
  },
  {
    label: '系統設定',
    icon: <Settings size={20} />,
    keys: [
      { key: 'site_name', label: '網站名稱', placeholder: 'Novadent 諾星' },
      { key: 'support_email', label: '客服信箱', placeholder: 'support@novadent.com' },
      { key: 'support_phone', label: '客服電話', placeholder: '02-12345678' },
    ],
  },
];

export function SuperSystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/system-settings');
      const data = await res.json();
      const map: Record<string, string> = {};
      for (const item of data) {
        map[item.key] = item.value || '';
      }
      setSettings(map);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const items = Object.entries(settings).map(([key, value]) => ({ key, value }));
      const res = await apiFetch('/admin/system-settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: items }),
      });
      if (res.ok) {
        setMessage('設定已儲存');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('儲存失敗');
      }
    } catch (e) {
      setMessage('儲存失敗');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">系統設定</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save size={16} />
          {saving ? '儲存中...' : '儲存設定'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('失敗') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {SETTING_GROUPS.map(group => (
        <div key={group.label} className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
            {group.icon}
            <h2 className="text-lg font-semibold text-gray-800">{group.label}</h2>
          </div>
          <div className="p-6 space-y-4">
            {group.keys.map(item => (
              <div key={item.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm font-medium text-gray-700 sm:w-32 shrink-0">{item.label}</label>
                <input
                  type={item.key.includes('pass') ? 'password' : 'text'}
                  value={settings[item.key] || ''}
                  onChange={e => handleChange(item.key, e.target.value)}
                  placeholder={item.placeholder}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
