/**
 * 會員「我的案件」頁面 — 顯示透過姓名+生日比對到的假牙案件
 * 會員可追蹤案件的製作進度
 */
import React, { useState, useEffect } from 'react';
import { ClipboardList, Loader2, Building2, Microscope } from 'lucide-react';
import { apiFetch } from '../../services/authService';

// 案件狀態對應
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  CREATED:     { label: '已建立',     color: 'bg-slate-100 text-slate-600' },
  ASSIGNED:    { label: '已指派牙技所', color: 'bg-amber-50 text-amber-700' },
  ACCEPTED:    { label: '牙技所已接案', color: 'bg-blue-50 text-blue-700' },
  IN_PROGRESS: { label: '製作中',     color: 'bg-indigo-50 text-indigo-700' },
  COMPLETED:   { label: '已完成',     color: 'bg-green-50 text-green-700' },
};

const TYPE_MAP: Record<string, string> = {
  FIXED: '固定式假牙', REMOVABLE: '活動式假牙', IMPLANT: '植牙牙冠',
};

interface MemberCase {
  id: string;
  type: string;
  status: string;
  progress: number;
  currentStage: string | null;
  createdAt: string;
  updatedAt: string;
  patientName: string;
  clinicName: string | null;
  labName: string | null;
}

export function MemberCases() {
  const [cases, setCases] = useState<MemberCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/cases/member')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.data ?? [];
        setCases(list);
        setLoading(false);
      })
      .catch(() => {
        setError('無法載入案件');
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList size={22} className="text-blue-900" /> 我的案件
        </h1>
        <p className="text-slate-500 mt-1 text-sm">追蹤您的假牙製作進度</p>
      </header>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">{error}</div>}

      {cases.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">目前沒有案件</p>
          <p className="text-slate-400 text-sm mt-1">當診所為您建立假牙案件後，會在這裡顯示</p>
        </div>
      )}

      <div className="space-y-3">
        {cases.map(c => {
          const st = STATUS_MAP[c.status] || { label: c.status, color: 'bg-slate-100 text-slate-600' };
          return (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all">
              {/* 上方：狀態標籤 + 類型 */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  {TYPE_MAP[c.type] || c.type}
                </span>
              </div>

              {/* 進度條 */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>製作進度</span>
                  <span className="font-semibold">{c.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${c.progress >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
                {c.currentStage && (
                  <p className="text-xs text-slate-400 mt-1">目前階段：{c.currentStage}</p>
                )}
              </div>

              {/* 診所 + 牙技所 */}
              <div className="flex gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-slate-400" />
                  <span>{c.clinicName || '—'}</span>
                </div>
                {c.labName && (
                  <div className="flex items-center gap-1.5">
                    <Microscope size={14} className="text-slate-400" />
                    <span>{c.labName}</span>
                  </div>
                )}
              </div>

              {/* 日期 */}
              <p className="text-xs text-slate-400 mt-2">
                建立：{new Date(c.createdAt).toLocaleDateString('zh-TW')}
                {c.updatedAt !== c.createdAt && ` ｜ 更新：${new Date(c.updatedAt).toLocaleDateString('zh-TW')}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
