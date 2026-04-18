/**
 * 會員「我的案件」頁面 — 顯示透過姓名+生日比對到的假牙案件
 * 點擊案件卡片可進入詳情，查看製程節點與照片
 */
import React, { useState, useEffect } from 'react';
import { ClipboardList, Loader2, Building2, Microscope, ArrowLeft, Camera, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../services/authService';
import { CaseStatus, STATUS_LABELS, STATUS_COLORS, CASE_TYPE_LABELS } from '../../types';

// 案件狀態對應（列表用）
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

// 狀態時間軸順序
const STATUS_ORDER: CaseStatus[] = [
  CaseStatus.RECOMMENDED,
  CaseStatus.CREATED,
  CaseStatus.ASSIGNED,
  CaseStatus.ACCEPTED,
  CaseStatus.IN_PROGRESS,
  CaseStatus.COMPLETED,
];

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

interface MfgStep {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  updatedAt?: string;
  note?: string;
  photoUrl?: string;
}

interface CaseDetail extends MemberCase {
  description?: string;
  mfgSteps: MfgStep[];
}

// ── 案件詳情面板（只讀）────────────────────────────────────────
// 根據 caseId 獨立抓取完整資料（含 mfgSteps），避免列表資料欄位不足
function MemberCaseDetailPanel({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(`/cases/${caseId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d))
      .catch(() => setError('無法載入案件詳情'))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  if (error || !data) return (
    <div className="max-w-2xl mx-auto p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 mb-6 text-sm">
        <ArrowLeft size={16} /> 返回
      </button>
      <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">{error || '找不到案件'}</div>
    </div>
  );

  const currentIdx = STATUS_ORDER.indexOf(data.status as CaseStatus);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> 返回案件列表
      </button>

      {/* 基本資訊 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
        <div className="mb-4">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[data.status as CaseStatus] || 'bg-slate-100 text-slate-600'}`}>
            {STATUS_LABELS[data.status as CaseStatus] || data.status}
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            {CASE_TYPE_LABELS[data.type as keyof typeof CASE_TYPE_LABELS] || data.type}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {data.clinicName && (
            <div>
              <p className="text-slate-400 text-xs mb-1">診所</p>
              <p className="font-medium text-slate-800">{data.clinicName}</p>
            </div>
          )}
          {data.labName && (
            <div>
              <p className="text-slate-400 text-xs mb-1">牙技所</p>
              <p className="font-medium text-slate-800">{data.labName}</p>
            </div>
          )}
          <div>
            <p className="text-slate-400 text-xs mb-1">建立日期</p>
            <p className="font-medium text-slate-800">{new Date(data.createdAt).toLocaleDateString('zh-TW')}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">更新日期</p>
            <p className="font-medium text-slate-800">{new Date(data.updatedAt).toLocaleDateString('zh-TW')}</p>
          </div>
        </div>
        {data.description && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">說明</p>
            <p className="text-sm text-slate-700">{data.description}</p>
          </div>
        )}
      </div>

      {/* 製作進度時間軸 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
        <h3 className="font-semibold text-slate-900 mb-5">案件進度</h3>
        <div className="space-y-4">
          {STATUS_ORDER.map((s, idx) => {
            const done = idx <= currentIdx;
            const active = idx === currentIdx;
            return (
              <div key={s} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-blue-950' : 'bg-slate-100'}`}>
                  {done
                    ? <CheckCircle2 size={16} className="text-white" />
                    : <div className="w-3 h-3 rounded-full bg-slate-300" />
                  }
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                    {STATUS_LABELS[s]}
                  </p>
                  {active && <p className="text-xs text-blue-700 mt-0.5">目前階段</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 製程節點（若有）*/}
      {data.mfgSteps && data.mfgSteps.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-900 mb-5">製作節點</h3>
          <div className="space-y-4">
            {data.mfgSteps.map(step => (
              <div key={step.id} className="flex gap-4 items-start">
                <div className={`mt-1 w-3 h-3 rounded-full shrink-0 ${
                  step.status === 'COMPLETED' ? 'bg-green-500' :
                  step.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-200'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-800">{step.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      step.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                      step.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {step.status === 'COMPLETED' ? '完成' : step.status === 'IN_PROGRESS' ? '進行中' : '待處理'}
                    </span>
                  </div>
                  {step.note && <p className="text-xs text-slate-500 mt-1">{step.note}</p>}
                  {step.photoUrl && (
                    <a href={step.photoUrl} target="_blank" rel="noreferrer"
                       className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 hover:underline">
                      <Camera size={12} /> 查看照片
                    </a>
                  )}
                  {step.updatedAt && (
                    <p className="text-xs text-slate-400 mt-1">{new Date(step.updatedAt).toLocaleDateString('zh-TW')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 主頁面：案件列表 ──────────────────────────────────────────
export function MemberCases() {
  const [cases, setCases] = useState<MemberCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null); // 控制是否顯示詳情面板

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

  // 點擊案件卡片後切換至詳情面板
  if (selectedId) {
    return <MemberCaseDetailPanel caseId={selectedId} onBack={() => setSelectedId(null)} />;
  }

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
        <p className="text-slate-500 mt-1 text-sm">追蹤您的假牙製作進度，點擊卡片查看詳情</p>
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
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)} // 點擊進入詳情
              className="w-full text-left bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
            >
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
