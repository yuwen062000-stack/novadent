// AdminMemberConsultations — Admin 查看所有會員諮詢記錄
// 功能：列表顯示所有 QA 問診記錄（含流水號 C-001），點擊展開查看答案與推薦診所
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, User, MapPin, Activity, Search } from 'lucide-react';
import { apiFetch } from '../../services/authService';

// 假牙類型對應中文顯示
const CASE_TYPE_LABEL: Record<string, string> = {
  FIXED:     '固定式假牙',
  REMOVABLE: '活動式假牙',
  IMPLANT:   '植牙牙冠',
};

// QA 問題 lookup 型別：{ qId → { text: 題目文字, options: { value → label } } }
interface QaLookupEntry {
  text: string;
  options: Record<string, string>;  // option value → 中文 label
}
type QaLookup = Record<string, QaLookupEntry>;  // key: "1", "2", ... (qa_questions.id 轉字串)

interface ConsultationRow {
  id: string;
  consultation_number: number;
  member_id: string;
  member_email: string;
  member_name: string;
  answers: any;
  inferred_case_type: string | null;
  selected_city: string | null;
  selected_district: string | null;
  summary: string | null;
  status: string;
  created_at: string;
}

interface ConsultationDetail extends ConsultationRow {
  recommendations: {
    id: string;
    name: string;
    city: string;
    district: string | null;
    rating: number | null;
    coverPhotoUrl: string | null;
  }[];
}

export function AdminMemberConsultations() {
  const [rows, setRows]           = useState<ConsultationRow[]>([]);  // 諮詢列表
  const [total, setTotal]         = useState(0);                       // 總筆數
  const [page, setPage]           = useState(1);                       // 目前頁碼
  const [loading, setLoading]     = useState(true);                    // 列表載入中
  const [expandedId, setExpandedId] = useState<string | null>(null);  // 展開中的記錄 ID
  const [detail, setDetail]       = useState<ConsultationDetail | null>(null);  // 展開的詳細資料
  const [detailLoading, setDetailLoading] = useState(false);           // 展開詳情載入中
  const [qaLookup, setQaLookup]   = useState<QaLookup>({});           // QA 題目 + 選項 lookup map
  const [search, setSearch]       = useState('');                      // 關鍵字（會員姓名/Email）
  const [filterType, setFilterType] = useState('');                    // 假牙類型篩選

  // 套用查詢條件（客戶端過濾目前頁的資料）
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (search) {
        const kw = search.toLowerCase();
        if (!r.member_name?.toLowerCase().includes(kw) && !r.member_email?.toLowerCase().includes(kw)) return false;
      }
      if (filterType && r.inferred_case_type !== filterType) return false;
      return true;
    });
  }, [rows, search, filterType]);

  const LIMIT = 20; // 每頁筆數

  // 載入 QA 問題 lookup（公開 API，轉換為 { qId → { text, options: { value→label } } }）
  useEffect(() => {
    apiFetch('/qa-questions')
      .then(r => r.ok ? r.json() : [])
      .then((questions: any[]) => {
        const lookup: QaLookup = {};
        (Array.isArray(questions) ? questions : []).forEach((q: any) => {
          const optMap: Record<string, string> = {};
          if (Array.isArray(q.options)) {
            q.options.forEach((opt: any) => {
              if (opt.value != null) {
                optMap[String(opt.value)] = opt.label ?? String(opt.value);
              }
            });
          }
          lookup[String(q.id)] = { text: q.questionText ?? `問題 ${q.id}`, options: optMap };
        });
        setQaLookup(lookup);
      })
      .catch(() => {}); // 失敗時保持空 map，renderAnswers 退回顯示原始值
  }, []);

  // 載入諮詢列表
  const load = (p = 1) => {
    setLoading(true);
    apiFetch(`/consultations/admin/all?page=${p}&limit=${LIMIT}`)
      .then(r => r.json())
      .then(data => {
        setRows(Array.isArray(data.data) ? data.data : []);
        setTotal(data.total ?? 0);
        setPage(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  // 點擊列展開/收合，展開時載入詳情
  const handleExpand = async (row: ConsultationRow) => {
    if (expandedId === row.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(row.id);
    setDetailLoading(true);
    try {
      const res  = await apiFetch(`/consultations/admin/${row.id}`);
      const data = await res.json();
      setDetail(data);
    } catch {
      setDetail(null);
    }
    setDetailLoading(false);
  };

  // 將 answers JSONB 轉為可讀文字列表
  // answers 格式：{ "q1": "FIXED", "q2": "missing", "q5": ["val1","val2"] }
  // key 格式為 "q${question.id}"，透過 qaLookup 解析為中文題目與答案
  const renderAnswers = (answers: any) => {
    if (!answers || typeof answers !== 'object') return <span className="text-slate-400">無資料</span>;

    return (
      <ul className="space-y-2">
        {Object.entries(answers).map(([k, v]) => {
          // 從 key "q1" → "1" 取得題目 id
          const qId    = k.replace(/^q/, '');
          const entry  = qaLookup[qId];

          // 題目文字：有 lookup 就用中文，否則顯示 key
          const qText  = entry?.text ?? k;

          // 答案文字：將 option value 轉成中文 label
          const resolveLabel = (val: string) =>
            entry?.options[val] ?? val;  // lookup 有對應就用中文，否則保留原值

          const answerText = Array.isArray(v)
            ? (v as string[]).map(resolveLabel).join('、')
            : resolveLabel(String(v));

          return (
            <li key={k} className="text-xs text-slate-600">
              <span className="font-semibold text-slate-700">{qText}：</span>
              <span>{answerText}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* 頁首 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">會員諮詢記錄</h1>
          <p className="text-slate-500 mt-1 text-sm">查看所有會員的 QA 問診答案與推薦診所結果（共 {total} 筆）</p>
        </div>
        <button onClick={() => load(page)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 flex items-center gap-2">
          <RefreshCw size={16} /> 重整
        </button>
      </div>

      {/* 查詢條件列 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜尋姓名或 Email..."
            className="pl-8 pr-3 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 bg-white">
          <option value="">全部類型</option>
          <option value="FIXED">固定式假牙</option>
          <option value="REMOVABLE">活動式假牙</option>
          <option value="IMPLANT">植牙牙冠</option>
        </select>
        {(search || filterType) && (
          <button onClick={() => { setSearch(''); setFilterType(''); }}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50">
            清除篩選
          </button>
        )}
        <span className="self-center text-xs text-slate-400">顯示 {filtered.length} / {total} 筆</span>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['編號', '會員', '假牙類型', '縣市', '日期', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading
                ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">載入中...</td></tr>
                : filtered.length === 0
                  ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">{rows.length === 0 ? '尚無諮詢記錄' : '無符合條件的記錄'}</td></tr>
                  : filtered.map(row => (
                    <React.Fragment key={row.id}>
                      {/* 列本身 */}
                      <tr
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleExpand(row)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded-lg">
                            C-{String(row.consultation_number).padStart(3, '0')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-slate-400 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{row.member_name || '—'}</p>
                              <p className="text-xs text-slate-400">{row.member_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {row.inferred_case_type
                            ? <span className="px-2 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold">
                                {CASE_TYPE_LABEL[row.inferred_case_type] ?? row.inferred_case_type}
                              </span>
                            : <span className="text-slate-400 text-xs">未判定</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-slate-600 text-sm">
                            <MapPin size={12} className="text-slate-400" />
                            {row.selected_city ?? '—'}
                            {row.selected_district ? ` ${row.selected_district}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(row.created_at).toLocaleDateString('zh-TW')}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {expandedId === row.id
                            ? <ChevronDown size={16} />
                            : <ChevronRight size={16} />
                          }
                        </td>
                      </tr>

                      {/* 展開區塊 */}
                      {expandedId === row.id && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50 px-6 py-5 border-b border-slate-200">
                            {detailLoading
                              ? <p className="text-sm text-slate-400 text-center py-4">載入詳情中...</p>
                              : detail && detail.id === row.id
                                ? <div className="grid md:grid-cols-2 gap-6">
                                    {/* 問卷答案 */}
                                    <div>
                                      <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <Activity size={14} className="text-blue-800" /> 問卷答案
                                      </h3>
                                      {renderAnswers(detail.answers)}
                                      {detail.summary && (
                                        <p className="mt-3 text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200">
                                          <span className="font-semibold">摘要：</span>{detail.summary}
                                        </p>
                                      )}
                                    </div>

                                    {/* 推薦診所 */}
                                    <div>
                                      <h3 className="text-sm font-bold text-slate-700 mb-3">
                                        推薦診所（{detail.recommendations.length} 筆）
                                      </h3>
                                      {detail.recommendations.length === 0
                                        ? <p className="text-xs text-slate-400">無符合條件的推薦診所</p>
                                        : <ul className="space-y-2">
                                            {detail.recommendations.map(c => (
                                              <li key={c.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                                                {c.coverPhotoUrl
                                                  ? <img src={c.coverPhotoUrl} alt={c.name} className="w-10 h-10 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
                                                  : <div className="w-10 h-10 rounded-lg bg-blue-50 shrink-0 flex items-center justify-center">
                                                      <Activity size={16} className="text-blue-400" />
                                                    </div>
                                                }
                                                <div>
                                                  <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                                                  <p className="text-xs text-slate-500">{c.city}{c.district ? ` ${c.district}` : ''}</p>
                                                </div>
                                                {c.rating != null && (
                                                  <span className="ml-auto text-xs font-bold text-amber-500">★ {c.rating}</span>
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                      }
                                    </div>
                                  </div>
                                : <p className="text-sm text-red-400 text-center py-4">載入失敗，請重新嘗試</p>
                            }
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-sm text-slate-500">共 {total} 筆，第 {page}/{totalPages} 頁</span>
            <div className="flex gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >上一頁</button>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >下一頁</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
