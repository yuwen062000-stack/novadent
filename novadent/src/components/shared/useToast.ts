// C-08 useToast hook — 輕量操作結果通知
// 使用：import { toast } from './shared';
//       toast.success('儲存成功'); toast.error('發生錯誤'); toast.info('提示訊息');
import { useState, useCallback, Dispatch, SetStateAction } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

let globalSetToasts: Dispatch<SetStateAction<ToastItem[]>> | null = null;

/** 註冊全域 setter（由 ToastContainer 呼叫） */
export function registerToastSetter(
  setter: Dispatch<SetStateAction<ToastItem[]>>
) {
  globalSetToasts = setter;
}

/** 全域 toast 觸發器（可在任何地方呼叫） */
export const toast = {
  success: (message: string) => fire('success', message),
  error:   (message: string) => fire('error', message),
  info:    (message: string) => fire('info', message),
};

function fire(type: ToastType, message: string) {
  if (!globalSetToasts) return;
  const id = `${Date.now()}-${Math.random()}`;
  globalSetToasts((prev) => [...prev, { id, type, message }]);
  // 3 秒後自動移除
  setTimeout(() => {
    globalSetToasts?.((prev) => prev.filter((t) => t.id !== id));
  }, 3000);
}

/** hook 版本（若需要在元件內使用 local toasts） */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return {
    toasts,
    toast: {
      success: (msg: string) => addToast('success', msg),
      error:   (msg: string) => addToast('error', msg),
      info:    (msg: string) => addToast('info', msg),
    },
  };
}
