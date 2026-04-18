import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, Star, Loader2, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../services/authService';

// ── 型別定義 ──────────────────────────────────────────────────

interface Consultation {
  id: string;
  inferredCaseType: string | null;      // 推斷假牙類型
  selectedCity: string | null;          // 選擇城市
  createdAt: string;                    // 建立時間
  consultation_number?: number;         // 全域流水號（與 Admin 顯示的 C-001 一致）
}

interface RecommendedClinic {
  id: string;
  name: string;
  leadDoctorName: string;
  city: string;
  district: string;
  detailedAddress: string;
  phone: string;
  rating: number;
  description: string;
  services: string[];
  coverPhotoUrl: string;
  districtMatch?: number;
}

interface Props {
  setView: (v: string) => void;
  consultationId?: string | null; // 從問卷頁帶入的最新 consultationId
}

// ── 假牙類型顯示標籤 ─────────────────────────────────────────
const CASE_TYPE_LABEL: Record<string, string> = {
  FIXED:     '固定式假牙',
  REMOVABLE: '活動式假牙',
  IMPLANT:   '植牙牙冠',
};

// ── 診所卡片（處理圖片失敗 → 隱藏圖片區塊）───────────────────
function ClinicCard({ clinic, rank }: { clinic: RecommendedClinic; rank: number }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* 封面圖片（失敗或無圖時不顯示空框） */}
      {clinic.coverPhotoUrl && !imgFailed && (
        <div className="h-40 bg-slate-100 overflow-hidden">
          <img
            src={clinic.coverPhotoUrl}
            alt={clinic.name}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                #{rank} 推薦
              </span>
              {clinic.districtMatch === 1 && (
                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  同區域
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900">{clinic.name}</h3>
            {clinic.leadDoctorName && (
              <p className="text-sm text-slate-500">{clinic.leadDoctorName.replace(/醫師$/, '').trim()} 醫師</p>
            )}
          </div>
          {clinic.rating && clinic.rating > 0 && (
            <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl">
              <Star size={14} className="fill-amber-400 stroke-amber-400" />
              <span className="text-sm font-bold text-amber-700">{Number(clinic.rating).toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
          <MapPin size={14} className="shrink-0" />
          <span>{clinic.city} {clinic.district} {clinic.detailedAddress || ''}</span>
        </div>

        {clinic.phone && (
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
            <Phone size={14} className="shrink-0" />
            <span>{clinic.phone}</span>
          </div>
        )}

        {clinic.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{clinic.description}</p>
        )}

        {clinic.services && clinic.services.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {clinic.services.slice(0, 4).map(s => (
              <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">{s}</span>
            ))}
          </div>
        )}

        {/* 致電診所（tel: 連結，手機直接撥號） */}
        {clinic.phone && (
          <a
            href={`tel:${clinic.phone}`}
            className="block w-full py-2.5 border border-slate-200 rounded-xl text-center text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            致電診所
          </a>
        )}
      </div>
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────────
export function MemberRecommendations({ setView, consultationId }: Props) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(consultationId ?? null);
  const [clinics, setClinics] = useState<RecommendedClinic[]>([]);
  const [cityLabel, setCityLabel] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [clinicError, setClinicError] = useState('');  // 推薦診所載入失敗訊息
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── 載入所有問診歷史 ────────────────────────────────────────
  useEffect(() => {
    apiFetch('/consultations')
      .then(r => r.ok ? r.json() : [])
      .then((data: Consultation[]) => {
        const list = Array.isArray(data) ? data : [];
        setConsultations(list);
        // 預設選：props 帶入的 id > 最新一筆 > null
        if (!selectedId && list.length > 0) {
          setSelectedId(list[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  // ── 切換選取的問診 → 載入對應推薦 ──────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    setLoadingClinics(true);
    setClinics([]);
    setClinicError('');  // 重置錯誤狀態
    apiFetch(`/consultations/${selectedId}/recommendations`)
      .then(r => {
        if (!r.ok) throw new Error('載入失敗');
        return r.json();
      })
      .then(data => {
        setClinics(data.recommendations || []);
        setCityLabel(data.city || '');
      })
      .catch(() => setClinicError('推薦診所載入失敗，請稍後再試'))
      .finally(() => setLoadingClinics(false));
  }, [selectedId]);

  // ── 橫向捲動按鈕 ───────────────────────────────────────────
  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
    }
  };

  // ── 格式化日期 ─────────────────────────────────────────────
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">推薦診所</h1>
        <p className="text-slate-500 text-sm mt-1">
          {cityLabel
            ? `根據您的需求，以下是${cityLabel}地區最適合的診所`
            : '根據您的需求，為您推薦以下診所'}
        </p>
      </header>

      {/* ── 歷史問診卡片（橫向捲動） ── */}
      {loadingHistory ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-blue-900" size={24} />
        </div>
      ) : consultations.length === 0 ? (
        /* 尚無問診記錄 */
        <div className="text-center py-16 text-slate-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="mb-4">您尚未填寫過問卷</p>
          <button
            onClick={() => setView('MEMBER_QA')}
            className="px-6 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            開始假牙問診
          </button>
        </div>
      ) : (
        <>
          {/* 歷史卡片列 */}
          <div className="relative mb-6">
            {/* 左右滑動按鈕（內容超過時才有意義） */}
            {consultations.length > 4 && (
              <>
                <button
                  onClick={() => scroll('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-slate-200 rounded-full shadow flex items-center justify-center hover:bg-slate-50 -ml-3"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => scroll('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-slate-200 rounded-full shadow flex items-center justify-center hover:bg-slate-50 -mr-3"
                >
                  <ChevronRight size={14} />
                </button>
              </>
            )}

            {/* 卡片容器：snap scroll，一次顯示 4 張 */}
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none' }}
            >
              {consultations.map((c, idx) => {
                const isSelected = c.id === selectedId;
                const typeLabel = c.inferredCaseType ? (CASE_TYPE_LABEL[c.inferredCaseType] ?? c.inferredCaseType) : '問診';
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`snap-start shrink-0 w-[calc(25%-9px)] min-w-[140px] p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-950 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold text-blue-800 mb-1">
                      C-{String(c.consultation_number ?? (consultations.length - idx)).padStart(3, '0')}
                    </div>
                    <div className={`text-sm font-bold mb-1 ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                      {typeLabel}
                    </div>
                    <div className="text-xs text-slate-500">{c.selectedCity || '不限地區'}</div>
                    <div className="text-xs text-slate-400 mt-1">{formatDate(c.createdAt)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 推薦診所列表 ── */}
          {loadingClinics ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-blue-900" size={28} />
            </div>
          ) : clinicError ? (
            <div className="text-center py-12 text-red-400">
              <p>{clinicError}</p>
            </div>
          ) : clinics.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="mb-2">該地區目前尚無符合條件的診所</p>
              <p className="text-sm">您可以重新填寫問卷選擇其他地區</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clinics.map((clinic, idx) => (
                <ClinicCard key={clinic.id} clinic={clinic} rank={idx + 1} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
