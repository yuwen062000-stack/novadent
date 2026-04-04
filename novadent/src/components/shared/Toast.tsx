// C-08 Toast + ToastContainer — 右上角輕量通知
// 使用：在 App 頂層放 <ToastContainer />，之後任何地方呼叫 toast.success() 即可
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { ToastItem, ToastType, registerToastSetter } from './useToast';

const TYPE_STYLES: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon: <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />,
  },
  error: {
    bg: 'bg-red-50 border-red-200 text-red-800',
    icon: <XCircle size={16} className="text-red-500 flex-shrink-0" />,
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: <Info size={16} className="text-blue-500 flex-shrink-0" />,
  },
};

/** 放在 App 頂層（BrowserRouter 內），提供全域 toast 服務 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 向全域 useToast 模組註冊 setter
  useEffect(() => {
    registerToastSetter(setToasts);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const style = TYPE_STYLES[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-2 px-3 py-2.5 rounded-lg border shadow-md text-sm min-w-[200px] max-w-xs ${style.bg}`}
            >
              {style.icon}
              <span className="flex-1 leading-snug">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-current opacity-50 hover:opacity-80 flex-shrink-0 mt-px"
                aria-label="關閉"
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
