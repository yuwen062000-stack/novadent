// C-11 FileUpload — 拖拉上傳 + 縮圖預覽
// 使用於：製程節點照片、診所/牙技所封面照
import React, { useRef, useState } from 'react';
import { UploadCloud, X, FileText } from 'lucide-react';
import { toast } from './useToast';

interface FileUploadProps {
  onFile: (file: File) => void;
  accept?: string;        // e.g. 'image/*' or 'image/*,.pdf'
  maxMB?: number;         // 預設 5MB
  /** 已存在的圖片 URL（編輯模式時顯示現有圖） */
  currentUrl?: string;
  className?: string;
}

export function FileUpload({
  onFile,
  accept = 'image/*',
  maxMB = 5,
  currentUrl,
  className = '',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isImage = (file: File) => file.type.startsWith('image/');

  const handle = (file: File) => {
    // 檔案大小驗證
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`檔案大小超過 ${maxMB}MB 限制`);
      return;
    }
    // 顯示預覽或檔名
    if (isImage(file)) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
      setFileName(file.name);
    }
    onFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handle(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handle(file);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {/* 拖拉區域 */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        {preview ? (
          /* 圖片縮圖預覽 */
          <div className="relative">
            <img
              src={preview}
              alt="預覽"
              className="w-full h-40 object-cover rounded-xl"
            />
            <button
              onClick={clear}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
              aria-label="移除檔案"
            >
              <X size={14} />
            </button>
          </div>
        ) : fileName ? (
          /* 非圖片檔名顯示 */
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FileText size={16} className="text-gray-400" />
              {fileName}
            </div>
            <button onClick={clear} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
        ) : (
          /* 預設上傳提示 */
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <UploadCloud size={28} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              拖拉檔案至此，或<span className="text-blue-600 font-medium">點擊選擇</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">最大 {maxMB}MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
