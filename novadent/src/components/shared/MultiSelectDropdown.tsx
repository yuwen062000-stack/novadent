// C-02 MultiSelectDropdown — 多選下拉（含搜尋）
// 使用於：所有後台查詢條件區
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = '請選擇...',
  className = '',
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // 點擊外部關閉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const remove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* 觸發區 */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="min-h-[38px] flex flex-wrap gap-1 items-center border border-gray-300 rounded-lg px-2 py-1 cursor-pointer bg-white hover:border-blue-400 transition-colors"
      >
        {selectedLabels.length === 0 ? (
          <span className="text-sm text-gray-400 px-1">{placeholder}</span>
        ) : (
          selectedLabels.map((label, i) => (
            <span
              key={selected[i]}
              className="flex items-center gap-0.5 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full"
            >
              {label}
              <button onClick={(e) => remove(selected[i], e)} className="hover:text-blue-900">
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          size={14}
          className={`ml-auto text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* 下拉清單 */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋..."
              className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="text-sm text-gray-400 text-center py-3">無符合選項</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selected.includes(opt.value)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {selected.includes(opt.value) && <Check size={10} className="text-white" />}
                  </span>
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
