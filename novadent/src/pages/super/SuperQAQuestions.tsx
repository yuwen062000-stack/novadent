import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface QAQuestion {
  id: number;
  questionText: string;
  questionType: string;
  options: { value: string; label: string; score: number }[];
  orderIndex: number;
  category: string;
  isActive: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  single_choice: '單選',
  multiple_choice: '多選',
  text_input: '文字輸入',
};

export function SuperQAQuestions() {
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<QAQuestion | null>(null);
  const [form, setForm] = useState({
    questionText: '',
    questionType: 'single_choice',
    category: '',
    options: [{ value: 'a', label: '', score: 0 }] as { value: string; label: string; score: number }[],
  });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch('/qa-questions/all')
      .then(r => r.json())
      .then(data => { setQuestions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ questionText: '', questionType: 'single_choice', category: '', options: [{ value: 'a', label: '', score: 0 }] });
    setShowModal(true);
  };

  const openEdit = (q: QAQuestion) => {
    setEditTarget(q);
    setForm({
      questionText: q.questionText,
      questionType: q.questionType,
      category: q.category || '',
      options: q.options && q.options.length > 0 ? q.options : [{ value: 'a', label: '', score: 0 }],
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.questionText) return alert('請填入題目');
    setSubmitting(true);
    const url = editTarget ? `/qa-questions/${editTarget.id}` : '/qa-questions';
    const res = await apiFetch(url, {
      method: editTarget ? 'PUT' : 'POST',
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) { setShowModal(false); load(); }
    else { const err = await res.json(); alert(err.message || '操作失敗'); }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('確定停用此題目？')) return;
    await apiFetch(`/qa-questions/${id}`, { method: 'DELETE' });
    load();
  };

  const addOption = () => setForm(p => ({
    ...p,
    options: [...p.options, { value: String.fromCharCode(97 + p.options.length), label: '', score: 0 }],
  }));

  const removeOption = (i: number) => setForm(p => ({ ...p, options: p.options.filter((_, idx) => idx !== i) }));

  const updateOption = (i: number, key: string, val: string | number) =>
    setForm(p => ({ ...p, options: p.options.map((o, idx) => idx === i ? { ...o, [key]: val } : o) }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">QA 問卷管理</h1>
          <p className="text-slate-500 mt-1 text-sm">管理問診問卷的題目與選項</p>
        </div>
        <button onClick={openCreate} className="bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-blue-900 transition-colors">
          <Plus size={18} /> 新增題目
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400">載入中...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">尚無題目</div>
        ) : questions.map((q, i) => (
          <div key={q.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${!q.isActive ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full">Q{i + 1}</span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{TYPE_LABELS[q.questionType] || q.questionType}</span>
                  {q.category && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{q.category}</span>}
                  {!q.isActive && <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">已停用</span>}
                </div>
                <p className="font-medium text-slate-900">{q.questionText}</p>
                {q.options && q.options.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.options.map((o, oi) => (
                      <span key={oi} className="text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-slate-600">
                        {o.label} {o.score > 0 ? `(+${o.score})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {q.isActive && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(q)} className="p-1.5 text-slate-400 hover:text-blue-800 transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => handleDeactivate(q.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{editTarget ? '編輯題目' : '新增題目'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">題目 *</label>
                <textarea
                  rows={2}
                  value={form.questionText}
                  onChange={e => setForm(p => ({ ...p, questionText: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">題型</label>
                  <select
                    value={form.questionType}
                    onChange={e => setForm(p => ({ ...p, questionType: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800"
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">分類</label>
                  <input
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    placeholder="teeth / pain / aesthetics..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800"
                  />
                </div>
              </div>
              {(form.questionType === 'single_choice' || form.questionType === 'multiple_choice') && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-500">選項</label>
                    <button onClick={addOption} className="text-xs text-blue-800 font-bold hover:text-blue-900">+ 新增選項</button>
                  </div>
                  <div className="space-y-2">
                    {form.options.map((o, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          value={o.label}
                          onChange={e => updateOption(i, 'label', e.target.value)}
                          placeholder={`選項 ${i + 1}`}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800"
                        />
                        <input
                          type="number"
                          value={o.score}
                          onChange={e => updateOption(i, 'score', Number(e.target.value))}
                          placeholder="分數"
                          className="w-16 px-2 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-800"
                        />
                        {form.options.length > 1 && (
                          <button onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">取消</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-bold hover:bg-blue-900 disabled:opacity-50">
                {submitting ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
