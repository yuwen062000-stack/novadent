import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Star, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../services/authService';

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
  consultationId?: string | null;
}

export function MemberRecommendations({ setView, consultationId }: Props) {
  const [clinics, setClinics] = useState<RecommendedClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cityLabel, setCityLabel] = useState('');

  useEffect(() => {
    async function load() {
      try {
        if (consultationId) {
          const res = await apiFetch(`/consultations/${consultationId}/recommendations`);
          if (!res.ok) throw new Error('fetch failed');
          const data = await res.json();
          setClinics(data.recommendations || []);
          setCityLabel(data.city || '');
        } else {
          const res = await apiFetch('/clinics?status=ACTIVE&limit=10');
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.data ?? [];
          setClinics(list);
        }
      } catch {
        setError('無法載入推薦診所，請稍後再試');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [consultationId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-900" size={32} />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <header className="mb-8">
        <button
          onClick={() => setView('MEMBER_QA')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> 返回問卷
        </button>
        <h1 className="text-2xl font-bold text-slate-900">為您推薦的診所</h1>
        <p className="text-slate-500 text-sm mt-1">
          {cityLabel
            ? `根據您的需求，以下是${cityLabel}地區最適合的診所`
            : '根據您的需求，以下診所最適合您'}
        </p>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">{error}</div>
      )}

      {clinics.length === 0 && !error && (
        <div className="text-center py-12 text-slate-400">
          <p className="mb-2">目前該地區尚無推薦診所</p>
          <p className="text-sm">您可以返回問卷選擇其他地區</p>
        </div>
      )}

      <div className="space-y-4">
        {clinics.map((clinic, idx) => (
          <div key={clinic.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {clinic.coverPhotoUrl && (
              <div className="h-40 bg-slate-100 overflow-hidden">
                <img
                  src={clinic.coverPhotoUrl}
                  alt={clinic.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      #{idx + 1} 推薦
                    </span>
                    {clinic.districtMatch === 1 && (
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        同區域
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{clinic.name}</h3>
                  {clinic.leadDoctorName && (
                    <p className="text-sm text-slate-500">{clinic.leadDoctorName} 醫師</p>
                  )}
                </div>
                {clinic.rating && clinic.rating > 0 && (
                  <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl">
                    <Star size={14} className="fill-amber-400 stroke-amber-400" />
                    <span className="text-sm font-bold text-amber-700">{Number(clinic.rating).toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
                <MapPin size={14} className="shrink-0" />
                <span>{clinic.city} {clinic.district} {clinic.detailedAddress || ''}</span>
              </div>

              {clinic.phone && (
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                  <Phone size={14} className="shrink-0" />
                  <span>{clinic.phone}</span>
                </div>
              )}

              {clinic.description && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{clinic.description}</p>
              )}

              {clinic.services && clinic.services.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {clinic.services.slice(0, 4).map(s => (
                    <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">{s}</span>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                {clinic.phone && (
                  <a
                    href={`tel:${clinic.phone}`}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-center text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    致電診所
                  </a>
                )}
                <button
                  onClick={() => setView('MEMBER_CASES')}
                  className="flex-1 py-2.5 bg-blue-950 text-white rounded-xl text-center text-sm font-medium hover:bg-blue-900 transition-colors flex items-center justify-center gap-1"
                >
                  查看我的案件 <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
