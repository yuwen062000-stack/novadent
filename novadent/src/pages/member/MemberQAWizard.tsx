import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface QAQuestion {
  id: number;
  questionText: string;
  questionType: 'SINGLE' | 'MULTIPLE' | 'TEXT';
  options: string[] | null;
  orderIndex: number;
  category: string;
}

interface Props {
  setView: (v: string) => void;
}

export function MemberQAWizard({ setView }: Props) {
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/qa-questions')
      .then(r => r.json())
      .then((data: QAQuestion[]) => {
        if (data.length === 0) {
          // Fallback hardcoded questions if none configured
          setQuestions([
            { id: 1, questionText: '您目前需要哪種假牙？', questionType: 'SINGLE', options: ['固定式假牙（牙冠/牙橋）', '活動式假牙（局部/全口）', '植牙牙冠'], orderIndex: 1, category: '需求' },
            { id: 2, questionText: '您的狀況描述', questionType: 'SINGLE', options: ['缺牙需要補', '舊假牙需要更換', '牙齒損壞需要修復', '預防性保護'], orderIndex: 2, category: '需求' },
            { id: 3, questionText: '您偏好的材質？', questionType: 'SINGLE', options: ['全瓷（美觀優先）', '鋯瓷（強度兼顧）', '金屬烤瓷（性價比）', '不確定，請推薦'], orderIndex: 3, category: '偏好' },
            { id: 4, questionText: '您的所在城市？', questionType: 'SINGLE', options: ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '其他'], orderIndex: 4, category: '地區' },
            { id: 5, questionText: '您希望診所有哪些特點？（可複選）', questionType: 'MULTIPLE', options: ['提供分期付款', '有充足停車位', '周末有診', '提供數位掃描', '有長期合作牙技所'], orderIndex: 5, category: '偏好' },
          ]);
        } else {
          setQuestions(data);
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

  function handleSingleSelect(option: string) {
    setAnswers(prev => ({ ...prev, [currentQ.id]: option }));
  }

  function handleMultiSelect(option: string) {
    const current = (answers[currentQ.id] as string[]) || [];
    const updated = current.includes(option)
      ? current.filter(o => o !== option)
      : [...current, option];
    setAnswers(prev => ({ ...prev, [currentQ.id]: updated }));
  }

  function handleTextChange(val: string) {
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
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
      const payload = {
        answers: Object.entries(answers).map(([qId, ans]) => ({
          questionId: parseInt(qId),
          answer: Array.isArray(ans) ? ans.join(', ') : ans,
        }))
      };
      const res = await apiFetch('/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Submit failed');
      const data = await res.json();
      setConsultationId(data.id);
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
      <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-950 text-white rounded-xl">重新整理</button>
    </div>
  );

  if (!currentQ) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">假牙需求問卷</h1>
        <p className="text-slate-500 text-sm">完成問卷後，我們將為您推薦最適合的合作診所</p>
      </header>

      {/* Progress bar */}
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

      {/* Question card */}
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
                key={opt}
                onClick={() => handleSingleSelect(opt)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm font-medium ${
                  answers[currentQ.id] === opt
                    ? 'border-blue-950 bg-blue-50 text-blue-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {currentQ.questionType === 'MULTIPLE' && currentQ.options && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-4">可複選</p>
            {currentQ.options.map(opt => {
              const selected = ((answers[currentQ.id] as string[]) || []).includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => handleMultiSelect(opt)}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm font-medium flex items-center gap-3 ${
                    selected
                      ? 'border-blue-950 bg-blue-50 text-blue-950'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selected ? 'border-blue-950 bg-blue-950' : 'border-slate-300'}`}>
                    {selected && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  {opt}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
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
