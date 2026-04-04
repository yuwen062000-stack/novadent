// C-05 SortableTable — 可排序列表 + 分頁
// 使用於：所有後台列表頁
import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  /** 自訂 render 函式 */
  render?: (value: any, row: any) => React.ReactNode;
}

interface SortableTableProps {
  columns: TableColumn[];
  data: any[];
  pageSize?: number;
  /** 無資料時的說明文字 */
  emptyText?: string;
  rowKey?: (row: any) => string;
}

type SortDir = 'asc' | 'desc' | null;

export function SortableTable({
  columns,
  data,
  pageSize = 10,
  emptyText = '目前沒有資料',
  rowKey,
}: SortableTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  // 排序邏輯
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), 'zh-TW', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  // 分頁
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown size={12} className="text-gray-300" />;
    if (sortDir === 'asc') return <ChevronUp size={12} className="text-blue-600" />;
    return <ChevronDown size={12} className="text-blue-600" />;
  };

  if (data.length === 0) {
    return <EmptyState description={emptyText} />;
  }

  return (
    <div>
      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap ${
                    col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                  }`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : i}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-700">
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分頁控制 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            共 {sorted.length} 筆，第 {page} / {totalPages} 頁
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              上一頁
            </button>
            {/* 頁碼按鈕（最多顯示 5 頁） */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e${i}`} className="px-2 py-1 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-xs border rounded transition-colors ${
                      p === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              下一頁
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
