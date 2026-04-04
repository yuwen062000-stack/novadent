// C-06 StatusBadge — 狀態標籤（顏色統一）
// 使用於：案件狀態、帳號狀態、審核狀態
import React from 'react';

/** 預設顏色對應表（Tailwind 類別）
 *  注意：PartnerStatus enum 值與字串 'PENDING'/'ACTIVE'/'DISABLED' 相同，
 *  用字串 key 避免 TS1117 重複 key 錯誤
 */
const DEFAULT_COLOR_MAP: Record<string, string> = {
  // CaseStatus
  'RECOMMENDED': 'bg-blue-100 text-blue-700',
  'CREATED':     'bg-slate-100 text-slate-700',
  'ASSIGNED':    'bg-amber-100 text-amber-700',
  'ACCEPTED':    'bg-indigo-100 text-indigo-700',
  'IN_PROGRESS': 'bg-blue-100 text-blue-900',
  'COMPLETED':   'bg-green-100 text-green-700',
  // PartnerStatus / 通用
  'PENDING':     'bg-yellow-100 text-yellow-700',
  'ACTIVE':      'bg-emerald-100 text-emerald-700',
  'DISABLED':    'bg-red-100 text-red-600',
};

/** 友善顯示文字 */
const DEFAULT_LABELS: Record<string, string> = {
  'RECOMMENDED': '診所推薦',
  'CREATED':     '已建立',
  'ASSIGNED':    '已指派',
  'ACCEPTED':    '已接單',
  'IN_PROGRESS': '製作中',
  'COMPLETED':   '已完成',
  'PENDING':     '待審核',
  'ACTIVE':      '已啟用',
  'DISABLED':    '已停用',
};

interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, string>;
  labelMap?: Record<string, string>;
}

export function StatusBadge({ status, colorMap, labelMap }: StatusBadgeProps) {
  const colors = { ...DEFAULT_COLOR_MAP, ...colorMap };
  const labels = { ...DEFAULT_LABELS, ...labelMap };

  const colorClass = colors[status] ?? 'bg-gray-100 text-gray-600';
  const label = labels[status] ?? status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${colorClass}`}>
      {label}
    </span>
  );
}
