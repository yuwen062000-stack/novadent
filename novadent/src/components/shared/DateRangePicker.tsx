// C-04 DateRangePicker — 日期區間選擇 + 快捷按鈕
// 使用於：所有含時間範圍的後台查詢條件
import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  onChange: (start: string, end: string) => void;
  className?: string;
}

/** 格式化今天日期為 YYYY-MM-DD */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 格式化 Date 為 YYYY-MM-DD */
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className = '',
}: DateRangePickerProps) {
  // 快捷：今天
  const setToday = () => {
    const t = today();
    onChange(t, t);
  };

  // 快捷：本週（週一到今天）
  const setThisWeek = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diff = day === 0 ? 6 : day - 1; // 距週一天數
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    onChange(fmt(monday), today());
  };

  // 快捷：本月
  const setThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    onChange(fmt(first), today());
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Calendar size={14} className="text-gray-400 flex-shrink-0" />
      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange(e.target.value, endDate)}
        max={endDate || today()}
        className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-gray-400 text-sm">～</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange(startDate, e.target.value)}
        min={startDate}
        max={today()}
        className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {/* 快捷按鈕 */}
      <div className="flex gap-1">
        {[
          { label: '今天', action: setToday },
          { label: '本週', action: setThisWeek },
          { label: '本月', action: setThisMonth },
        ].map(({ label, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
