// C-03 KeywordSearchDropdown — 關鍵字搜尋下拉（單選）
// 使用於：後台搜尋特定帳號/案件
import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface KeywordSearchDropdownProps {
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function KeywordSearchDropdown({
  options,
  value,
  onChange,
  placeholder = '搜尋...',
  className = '',
}: KeywordSearchDropdownProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  // 點擊外部關閉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setKeyword('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(keyword.toLowerCase())
  );

  const select = (opt: Option) => {
    onChange(opt.value);
    setKeyword('');
    setOpen(false);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setKeyword('');
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* 觸發區 */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white cursor-pointer hover:border-blue-400 transition-colors min-w-[180px]"
      >
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        {value ? (
          <span className="text-sm flex-1 truncate">{selectedLabel}</span>
        ) : (
          <span className="text-sm text-gray-400 flex-1">{placeholder}</span>
        )}
        {value && (
          <button onClick={clear} className="text-gray-400 hover:text-gray-600">
            <X size={12} />
          </button>
        )}
      </div>

      {/* 下拉清單 */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2">
            <input
              autoFocus
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="輸入關鍵字..."
              className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="text-sm text-gray-400 text-center py-3">無符合結果</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  onClick={() => select(opt)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                    opt.value === value ? 'bg-blue-50 text-blue-700 font-medium' : ''
                  }`}
                >
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
