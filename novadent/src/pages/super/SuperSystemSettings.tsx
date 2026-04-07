import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Mail, Settings, Phone, Share2, FileText, Search } from 'lucide-react';
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
    label: '站台資訊',
    icon: <Settings size={20} />,
    keys: [
      { key: 'site_name', label: '網站名稱', placeholder: 'Novadent 諾星' },
      // 注意：前台 Footer 顯示的聯絡電話/信箱/地址請至下方「聯絡資訊」設定
    ],
  },
  {
    // SEO 設定：儲存後前端動態套用到 <head>，不需重新部署
    label: 'SEO 搜尋引擎設定',
    icon: <Search size={20} />,
    keys: [
      { key: 'seo_title',          label: '網頁標題（<title>）',   placeholder: 'Novadent 諾星 — 牙科整合協作平台' },
      { key: 'seo_description',    label: 'Meta 描述',              placeholder: 'Novadent 連結診所、牙技所與會員，提供透明化假牙製程追蹤...' },
      { key: 'seo_og_title',       label: 'OG 標題（社群分享）',   placeholder: 'Novadent 諾星 — 牙科整合協作平台' },
      { key: 'seo_og_description', label: 'OG 描述（社群分享）',   placeholder: '連結診所、牙技所與會員，建立醫療信任新標準。' },
      { key: 'seo_og_url',         label: '網站網址（OG URL）',    placeholder: 'https://novadent.replit.app' },
    ],
  },
];

export function SuperSystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [pageContents, setPageContents] = useState<Record<string, string>>({});
  const [savingContents, setSavingContents] = useState(false);
  const [contentMessage, setContentMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [settingsRes, contentsRes] = await Promise.all([
        apiFetch('/admin/system-settings'),
        apiFetch('/page-contents'),
      ]);
      const settingsData = await settingsRes.json();
      const contentsData = await contentsRes.json();

      const map: Record<string, string> = {};
      for (const item of settingsData) {
        map[item.key] = item.value || '';
      }
      setSettings(map);

      const cMap: Record<string, string> = {};
      for (const item of contentsData) {
        cMap[item.key] = item.value || '';
      }
      setPageContents(cMap);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleContentChange = (key: string, value: string) => {
    setPageContents(prev => ({ ...prev, [key]: value }));
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

  const handleSaveContents = async () => {
    setSavingContents(true);
    setContentMessage('');
    try {
      const entries = Object.entries(pageContents);
      for (const [key, value] of entries) {
        const contentType = ['TERMS', 'PRIVACY'].includes(key) ? 'RICHTEXT' : 'TEXT';
        const res = await apiFetch(`/admin/page-contents/${key}`, {
          method: 'PUT',
          body: JSON.stringify({ value, contentType }),
        });
        // 必須逐筆檢查 res.ok，否則 401/403 不拋例外，會錯誤顯示「已儲存」
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setContentMessage(`儲存失敗（${errData.message || res.status}）`);
          setSavingContents(false);
          return;
        }
      }
      setContentMessage('頁面內容已儲存');
      setTimeout(() => setContentMessage(''), 3000);
    } catch (e) {
      setContentMessage('儲存失敗');
    }
    setSavingContents(false);
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
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <Save size={16} />
          {saving ? '儲存中...' : '儲存系統設定'}
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

      <hr className="my-8 border-gray-200" />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">網站內容管理</h2>
        <button onClick={handleSaveContents} disabled={savingContents}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <Save size={16} />
          {savingContents ? '儲存中...' : '儲存內容設定'}
        </button>
      </div>

      {contentMessage && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${contentMessage.includes('失敗') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {contentMessage}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
          <Phone size={20} />
          <h2 className="text-lg font-semibold text-gray-800">聯絡資訊</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-gray-700 sm:w-32 shrink-0">聯絡電話</label>
            <input value={pageContents['CONTACT_PHONE'] || ''} onChange={e => handleContentChange('CONTACT_PHONE', e.target.value)}
              placeholder="02-12345678" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-gray-700 sm:w-32 shrink-0">聯絡信箱</label>
            <input value={pageContents['CONTACT_EMAIL'] || ''} onChange={e => handleContentChange('CONTACT_EMAIL', e.target.value)}
              placeholder="contact@novadent.com" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-gray-700 sm:w-32 shrink-0">聯絡地址</label>
            <input value={pageContents['CONTACT_ADDRESS'] || ''} onChange={e => handleContentChange('CONTACT_ADDRESS', e.target.value)}
              placeholder="台北市大安區..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
          <Share2 size={20} />
          <h2 className="text-lg font-semibold text-gray-800">社群連結</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-gray-700 sm:w-32 shrink-0">Facebook</label>
            <input value={pageContents['SOCIAL_FACEBOOK'] || ''} onChange={e => handleContentChange('SOCIAL_FACEBOOK', e.target.value)}
              placeholder="https://facebook.com/novadent" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-gray-700 sm:w-32 shrink-0">LINE</label>
            <input value={pageContents['SOCIAL_LINE'] || ''} onChange={e => handleContentChange('SOCIAL_LINE', e.target.value)}
              placeholder="@novadent" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
          <FileText size={20} />
          <h2 className="text-lg font-semibold text-gray-800">法律聲明</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">服務條款</label>
            <textarea value={pageContents['TERMS'] || ''} onChange={e => handleContentChange('TERMS', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              rows={12} placeholder="# 服務條款&#10;&#10;請輸入服務條款內容（支援 Markdown 格式）" />
            <p className="text-xs text-gray-400 mt-1">支援 Markdown 格式</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">隱私權政策</label>
            <textarea value={pageContents['PRIVACY'] || ''} onChange={e => handleContentChange('PRIVACY', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              rows={12} placeholder="# 隱私權政策&#10;&#10;請輸入隱私權政策內容（支援 Markdown 格式）" />
            <p className="text-xs text-gray-400 mt-1">支援 Markdown 格式</p>
          </div>
        </div>
      </div>
    </div>
  );
}
