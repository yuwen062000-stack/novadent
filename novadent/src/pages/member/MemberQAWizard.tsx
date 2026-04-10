import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface QAOptionRaw {
  label: string;
  value: string;
  score?: number;
}

interface QAQuestion {
  id: number;
  questionText: string;
  questionType: string;
  options: QAOptionRaw[] | null;
  orderIndex: number;
  category: string;
}

interface Props {
  setView: (v: string) => void;
  onConsultationCreated?: (id: string) => void;
}

function normalizeType(t: string): string {
  const map: Record<string, string> = {
    single_choice: 'SINGLE', SINGLE: 'SINGLE',
    multiple_choice: 'MULTIPLE', MULTIPLE: 'MULTIPLE',
    text_input: 'TEXT', TEXT: 'TEXT',
  };
  return map[t] || t;
}

function normalizeOptions(opts: any): QAOptionRaw[] | null {
  if (!opts || !Array.isArray(opts) || opts.length === 0) return null;
  if (typeof opts[0] === 'string') {
    return opts.map((s: string) => ({ label: s, value: s, score: 0 }));
  }
  if (typeof opts[0] === 'object' && (opts[0].label || opts[0].value)) {
    return opts.map((o: any) => ({
      label: o.label || o.value,
      value: o.value || o.label,
      score: o.score ?? 0,
    }));
  }
  return opts;
}

export function MemberQAWizard({ setView, onConsultationCreated }: Props) {
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    apiFetch('/qa-questions')
      .then(r => r.json())
      .then((data: any[]) => {
        if (data.length === 0) {
          setQuestions([
            { id: 1, questionText: '您目前需要哪種假牙？', questionType: 'SINGLE', options: [
              { label: '固定式假牙（牙冠/牙橋）', value: 'FIXED', score: 10 },
              { label: '活動式假牙（局部/全口）', value: 'REMOVABLE', score: 10 },
              { label: '植牙牙冠', value: 'IMPLANT', score: 10 },
            ], orderIndex: 1, category: '需求' },
            { id: 2, questionText: '您的狀況描述', questionType: 'SINGLE', options: [
              { label: '缺牙需要補', value: 'missing', score: 8 },
              { label: '舊假牙需要更換', value: 'replace', score: 8 },
              { label: '牙齒損壞需要修復', value: 'repair', score: 8 },
              { label: '預防性保護', value: 'prevention', score: 5 },
            ], orderIndex: 2, category: '需求' },
            { id: 3, questionText: '您偏好的材質？', questionType: 'SINGLE', options: [
              { label: '全瓷（美觀優先）', value: 'full_ceramic', score: 9 },
              { label: '鋯瓷（強度兼顧）', value: 'zirconia', score: 9 },
              { label: '金屬烤瓷（性價比）', value: 'pfm', score: 7 },
              { label: '不確定，請推薦', value: 'unsure', score: 5 },
            ], orderIndex: 3, category: '偏好' },
            { id: 4, questionText: '您的所在城市？', questionType: 'SINGLE', options: [
              { label: '台北市', value: '台北市', score: 0 },
              { label: '新北市', value: '新北市', score: 0 },
              { label: '桃園市', value: '桃園市', score: 0 },
              { label: '台中市', value: '台中市', score: 0 },
              { label: '台南市', value: '台南市', score: 0 },
              { label: '高雄市', value: '高雄市', score: 0 },
              { label: '其他縣市', value: '其他', score: 0 },
            ], orderIndex: 4, category: '地區' },
            { id: 5, questionText: '您希望診所有哪些特點？（可複選）', questionType: 'MULTIPLE', options: [
              { label: '提供分期付款', value: 'installment', score: 3 },
              { label: '有充足停車位', value: 'parking', score: 2 },
              { label: '週末有門診', value: 'weekend', score: 3 },
              { label: '提供數位掃描', value: 'digital', score: 4 },
              { label: '有長期合作牙技所', value: 'lab_partner', score: 5 },
            ], orderIndex: 5, category: '偏好' },
          ]);
        } else {
          const normalized = data.map(q => ({
            ...q,
            questionType: normalizeType(q.questionType),
            options: normalizeOptions(q.options),
          }));
          setQuestions(normalized);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('無法載入問卷，請重新整理');
        setLoading(false);
      });
  }, []);

  const currentQ = questions[currentIndex];
  const progress = questions.length ? ((currentIndex) / questions.length) * 100 : 0;

  function handleSingleSelect(value: string) {
    setAnswers(prev => ({ ...prev, [currentQ.id]: value }));
  }

  function handleMultiSelect(value: string) {
    const current = (answers[currentQ.id] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(o => o !== value)
      : [...current, value];
    setAnswers(prev => ({ ...prev, [currentQ.id]: updated }));
  }

  function handleTextChange(val: string) {
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
  }

  function getOptionLabel(questionId: number, value: string): string {
    const q = questions.find(q => q.id === questionId);
    if (!q || !q.options) return value;
    const opt = q.options.find(o => o.value === value);
    return opt?.label || value;
  }

  function canNext() {
    if (!currentQ) return false;
    const ans = answers[currentQ.id];
    if (currentQ.questionType === 'MULTIPLE') return Array.isArray(ans) && ans.length > 0;
    return !!ans;
  }

  function goNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      handleSubmit();
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const q1Id = questions.find(q => q.orderIndex === 1)?.id;
      const q4Id = questions.find(q => q.orderIndex === 4 || q.category === '地區')?.id;

      const q1Answer = q1Id ? (answers[q1Id] as string) : '';
      const q2City = q4Id ? (answers[q4Id] as string) : '';

      const answersObj: Record<string, any> = {};
      Object.entries(answers).forEach(([qId, ans]) => {
        answersObj[`q${qId}`] = ans;
      });

      const payload = {
        answers: answersObj,
        q1Answer: q1Answer || 'FIXED',
        q2City: q2City || '',
        summary: '',
      };

      const res = await apiFetch('/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Submit failed');
      const data = await res.json();
      if (onConsultationCreated) onConsultationCreated(data.id);
      setAnswers({});       // 清除答案，避免返回問卷頁時帶舊資料
      setCurrentIndex(0);   // 重置到第一題
      setSubmitted(true);
    } catch {
      setError('提交失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  if (submitted) return (
    <div className="max-w-xl mx-auto p-8 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="text-green-600" size={40} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-3">問卷完成！</h2>
      <p className="text-slate-500 mb-8">我們已根據您的需求分析最適合的診所，請查看推薦結果。</p>
      <button
        onClick={() => setView('MEMBER_RECOMMENDATIONS')}
        className="px-8 py-3 bg-blue-950 text-white rounded-xl font-semibold hover:bg-blue-900 transition-colors"
      >
        查看推薦診所
      </button>
    </div>
  );

  if (error) return (
    <div className="max-w-xl mx-auto p-8 text-center">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={() => { setError(''); }} className="px-6 py-2 bg-blue-950 text-white rounded-xl">重試</button>
    </div>
  );

  if (!currentQ) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">假牙需求問卷</h1>
        <p className="text-slate-500 text-sm">完成問卷後，我們將為您推薦最適合的合作診所</p>
      </header>

      <div className="mb-8">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>第 {currentIndex + 1} 題，共 {questions.length} 題</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-950 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm mb-6">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">{currentQ.category}</p>
        <h2 className="text-lg font-semibold text-slate-900 mb-6">{currentQ.questionText}</h2>

        {currentQ.questionType === 'TEXT' && (
          <textarea
            rows={4}
            value={(answers[currentQ.id] as string) || ''}
            onChange={e => handleTextChange(e.target.value)}
            placeholder="請輸入您的回答..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 text-sm"
          />
        )}

        {currentQ.questionType === 'SINGLE' && currentQ.options && (
          <div className="space-y-3">
            {currentQ.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSingleSelect(opt.value)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm font-medium ${
                  answers[currentQ.id] === opt.value
                    ? 'border-blue-950 bg-blue-50 text-blue-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {currentQ.questionType === 'MULTIPLE' && currentQ.options && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-4">可複選</p>
            {currentQ.options.map(opt => {
              const selected = ((answers[currentQ.id] as string[]) || []).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => handleMultiSelect(opt.value)}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm font-medium flex items-center gap-3 ${
                    selected
                      ? 'border-blue-950 bg-blue-50 text-blue-950'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selected ? 'border-blue-950 bg-blue-950' : 'border-slate-300'}`}>
                    {selected && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentIndex(i => i - 1)}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          <ChevronLeft size={18} /> 上一題
        </button>
        <button
          onClick={goNext}
          disabled={!canNext() || submitting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-950 text-white hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {currentIndex === questions.length - 1 ? '提交問卷' : '下一題'}
          {currentIndex < questions.length - 1 && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
}
