// C-01 PasswordInput — 明碼/隱碼切換輸入框
// 使用於：登入頁、建帳頁、修改密碼頁
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** 是否顯示眼睛切換按鈕，預設 true */
  showToggle?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = '請輸入密碼',
  showToggle = true,
  className = '',
  disabled = false,
  id,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${showToggle ? 'pr-10' : ''} ${className}`}
      />
      {showToggle && (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={visible ? '隱藏密碼' : '顯示密碼'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
}
