// LabPartnerClinics — 牙技所端合作診所清單（只讀，合作關係由診所或Admin建立）
import React, { useState, useEffect } from 'react';
import { RefreshCw, Building2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../services/authService';

interface PartnerClinic {
  id: string;       // partner-link id
  clinicId: string;
  clinicName: string;
  clinicCity: string;
  clinicPhone: string;
  clinicPhotoUrl?: string;
  createdAt: string;
}

export function LabPartnerClinics() {
  const [links, setLinks]     = useState<PartnerClinic[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await apiFetch('/partner-links/my').then(r => r.json());
    setLinks(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={22} className="text-blue-900" /> 合作診所
          </h1>
          <p className="text-slate-500 text-sm mt-1">目前與您合作的診所清單（由診所或管理員建立合作關係）</p>
        </div>
        <button onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500">
          <RefreshCw size={16} />
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-blue-900" size={28} />
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Building2 size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">尚無合作診所</p>
          <p className="text-slate-400 text-sm mt-1">當診所發起合作邀請後，將顯示於此</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <div key={link.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
              {link.clinicPhotoUrl ? (
                <img src={link.clinicPhotoUrl} alt={link.clinicName} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100" />
              ) : (
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 size={20} className="text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{link.clinicName || link.clinicId}</p>
                <div className="flex items-center gap-3 mt-0.5 text-sm text-slate-500">
                  {link.clinicCity && <span>{link.clinicCity}</span>}
                  {link.clinicPhone && <span>{link.clinicPhone}</span>}
                </div>
              </div>
              <span className="text-xs text-slate-400 shrink-0">
                {new Date(link.createdAt).toLocaleDateString('zh-TW')} 建立
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
