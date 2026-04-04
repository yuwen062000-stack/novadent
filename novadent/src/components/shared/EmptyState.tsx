// C-10 EmptyState — 查無資料畫面
// 使用於：所有後台列表頁無資料時
import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title = '查無資料',
  description = '目前沒有符合條件的項目',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-gray-300 mb-4">
        {icon ?? <Inbox size={48} />}
      </div>
      <p className="text-gray-600 font-medium mb-1">{title}</p>
      <p className="text-sm text-gray-400">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
