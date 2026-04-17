import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, CheckCircle2, Camera, Plus, X } from 'lucide-react';
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

interface CaseDetail {
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
  mfgSteps: MfgStep[];
}

interface Props {
  caseId: string;
  setView: (v: string) => void;
}

type MfgStepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export function LabCaseDetail({ caseId, setView }: Props) {
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [accepting, setAccepting] = useState(false);

  // Step update modal
  const [editingStep, setEditingStep] = useState<MfgStep | null>(null);
  const [stepNote, setStepNote] = useState('');
  const [stepStatus, setStepStatus] = useState<MfgStepStatus>('PENDING');
  const [stepPhoto, setStepPhoto] = useState<File | null>(null);
  const [stepPhotoPreview, setStepPhotoPreview] = useState('');
  const [savingStep, setSavingStep] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Add step modal
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [addingStep, setAddingStep] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  useEffect(() => {
    // caseId 為空代表直接瀏覽 URL 而未帶案件，導回列表避免永遠 loading
    if (!caseId) { setView('LAB_CASES'); return; }
    setLoading(true);
    apiFetch(`/cases/${caseId}`)
      .then(r => r.json())
      .then(data => {
        setCaseData(data);
        setLoading(false);
      })
      .catch(() => {
        setError('無法載入案件詳情');
        setLoading(false);
      });
  }, [caseId]);

  async function handleAccept() {
    if (!caseData) return;
    setAccepting(true);
    try {
      const res = await apiFetch(`/cases/${caseData.id}/accept`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setCaseData(updated);
      showToast('✅ 已接受案件');
    } catch {
      showToast('❌ 接受失敗，請稍後再試');
    } finally {
      setAccepting(false);
    }
  }

  function openEditStep(step: MfgStep) {
    setEditingStep(step);
    setStepNote(step.note || '');
    setStepStatus(step.status);
    setStepPhoto(null);
    setStepPhotoPreview(step.photoUrl || '');
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStepPhoto(file);
    const url = URL.createObjectURL(file);
    setStepPhotoPreview(url);
  }

  // ── 更新製程節點（含照片上傳）──
  // 穩定性：防連點（savingStep guard）+ 上傳失敗清理 + 詳細錯誤訊息
  async function handleSaveStep() {
    if (!editingStep || !caseData || savingStep) return;  // 防連點
    setSavingStep(true);
    try {
      let photoUrl = editingStep.photoUrl || '';

      // 上傳照片（如有選擇）
      if (stepPhoto) {
        const formData = new FormData();
        formData.append('file', stepPhoto);
        const uploadRes = await apiFetch('/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.message || '照片上傳失敗，請檢查檔案格式或大小');
        }
        const uploadData = await uploadRes.json();
        photoUrl = uploadData.url;
      }

      const res = await apiFetch(`/cases/${caseData.id}/steps/${editingStep.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: stepStatus,
          note: stepNote,
          photoUrl: photoUrl || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || '節點更新失敗');
      }
      const updatedCase = await res.json();
      setCaseData(updatedCase);
      // 成功後清理所有暫存狀態
      setEditingStep(null);
      setStepPhoto(null);
      setStepPhotoPreview('');
      showToast('✅ 製程節點已更新');
    } catch (err: any) {
      showToast(`❌ ${err.message || '更新失敗，請稍後再試'}`);
    } finally {
      setSavingStep(false);
    }
  }

  // ── 新增製程節點 ──
  // 穩定性：防連點（addingStep guard）+ 詳細錯誤訊息
  async function handleAddStep() {
    if (!newStepName.trim() || !caseData || addingStep) return;  // 防連點
    setAddingStep(true);
    try {
      const res = await apiFetch(`/cases/${caseData.id}/mfg-steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStepName.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || '新增節點失敗');
      }
      const updatedCase = await res.json();
      setCaseData(updatedCase);
      setShowAddStep(false);
      setNewStepName('');
      showToast('✅ 已新增製程節點');
    } catch (err: any) {
      showToast(`❌ ${err.message || '新增失敗，請稍後再試'}`);
    } finally {
      setAddingStep(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  if (error || !caseData) return (
    <div className="max-w-2xl mx-auto p-8">
      <button onClick={() => setView('LAB_CASES')} className="flex items-center gap-2 text-slate-400 mb-6 text-sm">
        <ArrowLeft size={16} /> 返回
      </button>
      <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error || '找不到案件'}</div>
    </div>
  );

  // 確保 mfgSteps 為陣列（後端可能未回傳此欄位）
  const c = { ...caseData, mfgSteps: caseData.mfgSteps ?? [] };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl">
          {toast}
        </div>
      )}

      <button onClick={() => setView('LAB_CASES')} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> 返回案件列表
      </button>

      {/* Case info */}
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
            <p className="text-sm text-slate-500">來自：{c.clinicName}</p>
          </div>
          {c.status === CaseStatus.ASSIGNED && (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 disabled:opacity-40 transition-colors"
            >
              {accepting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              接受案件
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>製作進度</span>
            <span>{c.progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-950 rounded-full transition-all" style={{ width: `${c.progress}%` }} />
          </div>
        </div>

        {c.description && (
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">說明</p>
            <p className="text-sm text-slate-700">{c.description}</p>
          </div>
        )}
      </div>

      {/* MFG Steps */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-900">製作節點</h3>
          {(c.status === CaseStatus.ACCEPTED || c.status === CaseStatus.IN_PROGRESS) && (
            <button
              onClick={() => setShowAddStep(true)}
              className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 font-medium transition-colors"
            >
              <Plus size={16} /> 新增節點
            </button>
          )}
        </div>

        {c.mfgSteps.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            <p>尚無製作節點</p>
            <p className="mt-1">點擊「新增節點」開始記錄製作進度</p>
          </div>
        )}

        <div className="space-y-3">
          {c.mfgSteps.map((step, idx) => (
            <div
              key={step.id}
              className="flex gap-4 items-start p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                step.status === 'COMPLETED' ? 'bg-green-500' :
                step.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-200'
              }`}>
                {step.status === 'COMPLETED' ? (
                  <CheckCircle2 size={14} className="text-white" />
                ) : (
                  <span className="text-xs font-bold text-slate-500">{idx + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
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
                    <img src={step.photoUrl} alt="製程照片" className="h-28 w-auto rounded-lg border border-slate-200 object-cover" />
                  </a>
                )}
              </div>
              {(c.status === CaseStatus.ACCEPTED || c.status === CaseStatus.IN_PROGRESS) && step.status !== 'COMPLETED' && (
                <button
                  onClick={() => openEditStep(step)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  更新
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Step Modal */}
      {editingStep && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900">更新製程節點</h3>
              <button onClick={() => setEditingStep(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm font-medium text-slate-700 mb-4">{editingStep.name}</p>

            {/* Status */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">狀態</label>
              <div className="flex gap-2">
                {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as MfgStepStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStepStatus(s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                      stepStatus === s ? 'border-blue-950 bg-blue-50 text-blue-950' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {s === 'PENDING' ? '待處理' : s === 'IN_PROGRESS' ? '進行中' : '完成'}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5 mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">備注</label>
              <textarea
                rows={3}
                value={stepNote}
                onChange={e => setStepNote(e.target.value)}
                placeholder="填寫備注或說明..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
              />
            </div>

            {/* Photo */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">製程照片</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              {stepPhotoPreview ? (
                <div className="relative">
                  <img src={stepPhotoPreview} alt="預覽" className="h-32 w-auto rounded-xl object-cover border border-slate-200" />
                  <button
                    onClick={() => { setStepPhoto(null); setStepPhotoPreview(''); }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-slate-300 transition-colors w-full justify-center"
                >
                  <Camera size={16} /> 上傳照片
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingStep(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveStep}
                disabled={savingStep}
                className="flex-1 py-3 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {savingStep && <Loader2 size={14} className="animate-spin" />}
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Step Modal */}
      {showAddStep && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900">新增製程節點</h3>
              <button onClick={() => setShowAddStep(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1.5 mb-6">
              <label className="text-sm font-semibold text-slate-700">節點名稱 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newStepName}
                onChange={e => setNewStepName(e.target.value)}
                placeholder="例如：取模、蠟型雕刻、上瓷..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowAddStep(false); setNewStepName(''); }}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleAddStep}
                disabled={!newStepName.trim() || addingStep}
                className="flex-1 py-3 bg-blue-950 text-white rounded-xl text-sm font-medium hover:bg-blue-900 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {addingStep && <Loader2 size={14} className="animate-spin" />}
                新增
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
