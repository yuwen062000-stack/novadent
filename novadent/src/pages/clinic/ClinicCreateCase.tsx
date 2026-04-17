import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface Lab {
  id: string;
  name: string;
  city: string;
  specialties: string[];
}

interface Props {
  setView: (v: string) => void;
}

// 案件類型從 system_options 動態讀取（fallback 寫死值避免空白）
const FALLBACK_CASE_TYPES = [
  { value: 'FIXED', label: '固定式假牙' },
  { value: 'REMOVABLE', label: '活動式假牙' },
  { value: 'IMPLANT', label: '植牙牙冠' },
];

export function ClinicCreateCase({ setView }: Props) {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLabs, setLoadingLabs] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  // 動態載入案件類型
  const [caseTypes, setCaseTypes] = useState(FALLBACK_CASE_TYPES);

  const [form, setForm] = useState({
    patientName: '',
    patientBirthday: '',
    type: '',
    description: '',
    labId: '',
  });

  // 載入案件類型選項（用 apiFetch 確保帶 JWT，避免 CDN 快取舊回應）
  useEffect(() => {
    apiFetch('/options/CASE_TYPE')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const types = Array.isArray(data) ? data.map((d: any) => ({ value: d.value, label: d.label })) : [];
        if (types.length > 0) {
          setCaseTypes(types);
          setForm(f => ({ ...f, type: f.type || types[0].value }));
        } else {
          setForm(f => ({ ...f, type: f.type || FALLBACK_CASE_TYPES[0].value }));
        }
      })
      .catch(() => {}); // API 失敗時保留 FALLBACK_CASE_TYPES
  }, []);

  // 只載入「已合作牙技所」作為案件指定選項
  // /partner-links/my 回傳 [{ labId, labName, labCity, ... }]，需轉成 Lab 格式
  useEffect(() => {
    apiFetch('/partner-links/my')
      .then(r => r.json())
      .then((data: any[]) => {
        const list = Array.isArray(data)
          ? data.map(pl => ({
              id:         pl.labId,
              name:       pl.labName,
              city:       pl.labCity ?? '',
              specialties: [],
            }))
          : [];
        setLabs(list);
        setLoadingLabs(false);
      })
      .catch(() => setLoadingLabs(false));
  }, []);

  function updateForm(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientName.trim()) { setError('請填寫病患姓名'); return; }
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        patientName: form.patientName.trim(),
        type: form.type,
        description: form.description.trim(),
      };
      if (form.patientBirthday) payload.patientBirthday = form.patientBirthday;
      if (form.labId) payload.labId = form.labId;

      const res = await apiFetch('/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '建立失敗');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || '建立案件失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  if (success) return (
    <div className="max-w-lg mx-auto p-8 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="text-green-600" size={40} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-3">案件已建立！</h2>
      <p className="text-slate-500 mb-8">案件已成功建立，您可以在案件列表中查看。</p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => setView('CLINIC_CASES')}
          className="px-6 py-2.5 bg-blue-950 text-white rounded-xl font-medium hover:bg-blue-900 transition-colors"
        >
          查看案件列表
        </button>
        <button
          onClick={() => { setSuccess(false); setForm({ patientName: '', patientBirthday: '', type: 'FIXED', description: '', labId: '' }); }}
          className="px-6 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          再建一筆
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <button onClick={() => setView('CLINIC_CASES')} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> 返回案件列表
      </button>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">新建案件</h1>
        <p className="text-slate-500 text-sm mt-1">填寫病患資料與假牙需求</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">{error}</div>
        )}

        {/* Patient name */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">病患姓名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.patientName}
            onChange={e => updateForm('patientName', e.target.value)}
            placeholder="輸入病患姓名"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all"
            required
          />
          <p className="text-xs text-slate-400">注意：會員端顯示時將進行名稱遮罩</p>
        </div>

        {/* Patient birthday — 防重名比對用 */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">病患生日 <span className="text-slate-400 font-normal text-xs">(選填，防重名比對)</span></label>
          <input
            type="date"
            value={form.patientBirthday}
            onChange={e => updateForm('patientBirthday', e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all"
          />
        </div>

        {/* Case type */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">假牙類型 <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-3 gap-3">
            {caseTypes.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => updateForm('type', t.value)}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.type === t.value
                    ? 'border-blue-950 bg-blue-50 text-blue-950'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">案件說明</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={e => updateForm('description', e.target.value)}
            placeholder="填寫假牙製作需求、特殊要求或備注..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all"
          />
        </div>

        {/* Lab selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">指派牙技所（選填）</label>
          <select
            value={form.labId}
            onChange={e => updateForm('labId', e.target.value)}
            disabled={loadingLabs}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 transition-all bg-white"
          >
            <option value="">先不指派（之後可再設定）</option>
            {labs.map(lab => (
              <option key={lab.id} value={lab.id}>
                {lab.name} — {lab.city}
              </option>
            ))}
          </select>
          {loadingLabs && <p className="text-xs text-slate-400">載入牙技所中...</p>}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !form.patientName.trim()}
            className="w-full py-3.5 bg-blue-950 text-white rounded-xl font-semibold hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            建立案件
          </button>
        </div>
      </form>
    </div>
  );
}
