import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
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

interface Lab {
  id: string;
  name: string;
  city: string;
}

interface CaseDetail {
  id: string;
  patientName: string;
  clinicName: string;
  labName?: string;
  labId?: string;
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
  caseId: string;
  setView: (v: string) => void;
}

export function ClinicCaseDetail({ caseId, setView }: Props) {
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigningLab, setAssigningLab] = useState(false);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [completing, setCompleting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => {
    if (!caseId) return;
    Promise.all([
      apiFetch(`/cases/${caseId}`).then(r => r.json()),
      apiFetch('/labs?status=ACTIVE').then(r => r.json()),
    ]).then(([c, labData]) => {
      setCaseData(c);
      setSelectedLabId(c.labId || '');
      const list = Array.isArray(labData) ? labData : labData.data ?? [];
      setLabs(list);
      setLoading(false);
    }).catch(() => {
      setError('無法載入案件詳情');
      setLoading(false);
    });
  }, [caseId]);

  async function handleAssignLab() {
    if (!selectedLabId || !caseData) return;
    setAssigningLab(true);
    try {
      const res = await apiFetch(`/cases/${caseData.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId: selectedLabId }),
      });
      if (!res.ok) throw new Error('指派失敗');
      const updated = await res.json();
      setCaseData(updated);
      showToast('✅ 已成功指派牙技所');
    } catch {
      showToast('❌ 指派失敗，請稍後再試');
    } finally {
      setAssigningLab(false);
    }
  }

  async function handleComplete() {
    if (!caseData) return;
    if (!confirm('確認案件製作完成？')) return;
    setCompleting(true);
    try {
      const res = await apiFetch(`/cases/${caseData.id}/complete`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setCaseData(updated);
      showToast('✅ 案件已標記完成');
    } catch {
      showToast('❌ 操作失敗');
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  if (error || !caseData) return (
    <div className="max-w-2xl mx-auto p-8">
      <button onClick={() => setView('CLINIC_CASES')} className="flex items-center gap-2 text-slate-400 mb-6 text-sm">
        <ArrowLeft size={16} /> 返回
      </button>
      <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error || '找不到案件'}</div>
    </div>
  );

  const c = caseData;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl">
          {toast}
        </div>
      )}

      <button onClick={() => setView('CLINIC_CASES')} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> 返回案件列表
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status]}`}>
                {STATUS_LABELS[c.status]}
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                {CASE_TYPE_LABELS[c.type as keyof typeof CASE_TYPE_LABELS] || c.type}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{c.patientName}</h1>
          </div>
          {c.status === CaseStatus.IN_PROGRESS && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              {completing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              確認完成
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-1">目前進度</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-950 rounded-full" style={{ width: `${c.progress}%` }} />
              </div>
              <span className="text-slate-700 font-medium">{c.progress}%</span>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">牙技所</p>
            <p className="font-medium text-slate-800">{c.labName || '未指派'}</p>
          </div>
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

      {/* Assign Lab */}
      {(c.status === CaseStatus.CREATED || c.status === CaseStatus.ASSIGNED) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
          <h3 className="font-semibold text-slate-900 mb-4">指派牙技所</h3>
          <div className="flex gap-3">
            <select
              value={selectedLabId}
              onChange={e => setSelectedLabId(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 bg-white"
            >
              <option value="">選擇牙技所</option>
              {labs.map(lab => (
                <option key={lab.id} value={lab.id}>
                  {lab.name} — {lab.city}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssignLab}
              disabled={!selectedLabId || assigningLab}
              className="px-5 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {assigningLab && <Loader2 size={14} className="animate-spin" />}
              指派
            </button>
          </div>
        </div>
      )}

      {/* MFG Steps */}
      {c.mfgSteps && c.mfgSteps.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-900 mb-5">製作節點</h3>
          <div className="space-y-4">
            {c.mfgSteps.map((step, idx) => (
              <div key={step.id} className="flex gap-4 items-start">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    step.status === 'COMPLETED' ? 'bg-green-500' :
                    step.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-200'
                  }`}>
                    {step.status === 'COMPLETED' ? (
                      <CheckCircle2 size={14} className="text-white" />
                    ) : (
                      <span className="text-xs font-bold text-slate-500">{idx + 1}</span>
                    )}
                  </div>
                  {idx < c.mfgSteps.length - 1 && (
                    <div className="w-px h-8 bg-slate-200 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">{step.name}</p>
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
                    <a href={step.photoUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                      <img src={step.photoUrl} alt="製程照片" className="rounded-lg h-32 object-cover border border-slate-200" />
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
