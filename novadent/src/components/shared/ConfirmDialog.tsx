// C-07 ConfirmDialog — 重大操作確認框
// 使用於：刪除、停用操作前的確認
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  /** danger=true 時確認鈕為紅色，用於刪除/停用操作 */
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = '確認',
  danger = false,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onCancel}
          />
          {/* 對話框 */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
          >
            {/* 圖示 + 標題 */}
            <div className="flex items-start gap-3 mb-3">
              {danger && (
                <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <h3 className="font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>

            {/* 操作按鈕 */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 text-sm rounded-lg text-white transition-colors ${
                  danger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
