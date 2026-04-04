import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Loader2, ChevronRight, ArrowLeft, Camera } from 'lucide-react';
import { apiFetch } from '../../services/authService';
import { CaseStatus, STATUS_LABELS, STATUS_COLORS, CASE_TYPE_LABELS } from '../../types';

interface MfgStep {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  updatedAt?: string;
  note?: string;
  photoUrl?: string;
}

interface CaseItem {
  id: string;
  patientName: string;
  clinicName: string;
  labName?: string;
  status: CaseStatus;
  type: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  progress: number;
  currentStage: string;
  mfgSteps: MfgStep[];
}

interface Props {
  setView: (v: string) => void;
}

const STATUS_ORDER: CaseStatus[] = [
  CaseStatus.RECOMMENDED,
  CaseStatus.CREATED,
  CaseStatus.ASSIGNED,
  CaseStatus.ACCEPTED,
  CaseStatus.IN_PROGRESS,
  CaseStatus.COMPLETED,
];

export function MemberCaseTracking({ setView }: Props) {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CaseItem | null>(null);

  useEffect(() => {
    apiFetch('/api/cases')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.data ?? [];
        setCases(list);
        setLoading(false);
      })
      .catch(() => {
        setError('無法載入案件資料');
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  if (selected) return <CaseDetailView c={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">我的假牙案件</h1>
        <p className="text-slate-500 text-sm mt-1">追蹤您的假牙製作進度</p>
      </header>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">{error}</div>}

      {cases.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-slate-400" />
          </div>
          <h3 className="text-slate-700 font-semibold mb-2">尚無案件</h3>
          <p className="text-slate-400 text-sm mb-6">完成問卷後，診所將為您建立假牙案件</p>
          <button
            onClick={() => setView('MEMBER_QA')}
            className="px-6 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 transition-colors"
          >
            開始問診
          </button>
        </div>
      )}

      <div className="space-y-4">
        {cases.map(c => {
          const statusIdx = STATUS_ORDER.indexOf(c.status);
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status]}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                  <h3 className="font-bold text-slate-900 mt-2">
                    {CASE_TYPE_LABELS[c.type as keyof typeof CASE_TYPE_LABELS] || c.type}
                  </h3>
                  <p className="text-sm text-slate-500">{c.clinicName}</p>
                </div>
                <ChevronRight size={20} className="text-slate-400 mt-1" />
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>製作進度</span>
                  <span>{c.progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-950 rounded-full transition-all"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-3">
                建立：{new Date(c.createdAt).toLocaleDateString('zh-TW')}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CaseDetailView({ c, onBack }: { c: CaseItem; onBack: () => void }) {
  const STATUS_ORDER: CaseStatus[] = [
    CaseStatus.RECOMMENDED,
    CaseStatus.CREATED,
    CaseStatus.ASSIGNED,
    CaseStatus.ACCEPTED,
    CaseStatus.IN_PROGRESS,
    CaseStatus.COMPLETED,
  ];
  const currentIdx = STATUS_ORDER.indexOf(c.status);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> 返回案件列表
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status]}`}>
              {STATUS_LABELS[c.status]}
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              {CASE_TYPE_LABELS[c.type as keyof typeof CASE_TYPE_LABELS] || c.type}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-1">診所</p>
            <p className="font-medium text-slate-800">{c.clinicName}</p>
          </div>
          {c.labName && (
            <div>
              <p className="text-slate-400 text-xs mb-1">牙技所</p>
              <p className="font-medium text-slate-800">{c.labName}</p>
            </div>
          )}
          <div>
            <p className="text-slate-400 text-xs mb-1">建立日期</p>
            <p className="font-medium text-slate-800">{new Date(c.createdAt).toLocaleDateString('zh-TW')}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">更新日期</p>
            <p className="font-medium text-slate-800">{new Date(c.updatedAt).toLocaleDateString('zh-TW')}</p>
          </div>
        </div>
        {c.description && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">說明</p>
            <p className="text-sm text-slate-700">{c.description}</p>
          </div>
        )}
      </div>

      {/* Status timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-5">案件進度</h3>
        <div className="space-y-4">
          {STATUS_ORDER.map((s, idx) => {
            const done = idx <= currentIdx;
            const active = idx === currentIdx;
            return (
              <div key={s} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  done ? 'bg-blue-950' : 'bg-slate-100'
                }`}>
                  {done ? (
                    <CheckCircle2 size={16} className="text-white" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                    {STATUS_LABELS[s]}
                  </p>
                  {active && (
                    <p className="text-xs text-blue-700 mt-0.5">目前階段</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MFG Steps */}
      {c.mfgSteps && c.mfgSteps.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-900 mb-5">製作節點</h3>
          <div className="space-y-4">
            {c.mfgSteps.map(step => (
              <div key={step.id} className="flex gap-4 items-start">
                <div className={`mt-1 w-3 h-3 rounded-full shrink-0 ${
                  step.status === 'COMPLETED' ? 'bg-green-500' :
                  step.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-200'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
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
                    <a href={step.photoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 hover:underline">
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
