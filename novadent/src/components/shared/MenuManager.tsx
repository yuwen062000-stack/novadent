// C-12 MenuManager — 選單管理（SuperAdmin 後台）
// 使用於：M-09 SuperAdmin 後台，管理前台導覽列與後台側選單
import React, { useState } from 'react';
import { GripVertical, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { UserRole } from '../../types';
import { MenuItem } from '../../types';

/** 各角色顯示名稱 */
const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  GUEST:   '訪客',
  MEMBER:  '會員',
  CLINIC:  '診所',
  LAB:     '牙技所',
  ADMIN:   '管理員',
};

const ALL_ROLES: UserRole[] = ['GUEST', 'MEMBER', 'CLINIC', 'LAB', 'ADMIN'];

interface MenuManagerProps {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
}

export function MenuManager({ items, onChange }: MenuManagerProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  // 上移
  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    // 重新指派 order
    onChange(next.map((item, i) => ({ ...item, order: i })));
  };

  // 下移
  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next.map((item, i) => ({ ...item, order: i })));
  };

  // 切換整體可見
  const toggleVisible = (id: string) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    );
  };

  // 切換角色可見
  const toggleRole = (id: string, role: UserRole) => {
    onChange(
      items.map((item) => {
        if (item.id !== id) return item;
        const roles = item.roles.includes(role)
          ? item.roles.filter((r) => r !== role)
          : [...item.roles, role];
        return { ...item, roles };
      })
    );
  };

  // 開始編輯名稱
  const startEdit = (item: MenuItem) => {
    setEditing(item.id);
    setEditLabel(item.label);
  };

  // 儲存名稱
  const saveEdit = (id: string) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, label: editLabel.trim() || item.label } : item
      )
    );
    setEditing(null);
  };

  return (
    <div className="space-y-2">
      {items
        .sort((a, b) => a.order - b.order)
        .map((item, index) => (
          <div
            key={item.id}
            className={`border rounded-xl p-3 transition-colors ${
              item.visible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              {/* 排序按鈕（取代拖拉，避免引入 DnD 庫） */}
              <div className="flex flex-col">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 p-0.5"
                  aria-label="上移"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === items.length - 1}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 p-0.5"
                  aria-label="下移"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <GripVertical size={14} className="text-gray-300 flex-shrink-0" />

              {/* 名稱（點擊編輯） */}
              <div className="flex-1">
                {editing === item.id ? (
                  <input
                    autoFocus
                    value={editLabel}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setEditLabel(newVal);
                      onChange(
                        items.map((item2) =>
                          item2.id === editing
                            ? { ...item2, label: newVal }
                            : item2
                        )
                      );
                    }}
                    onBlur={() => saveEdit(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(item.id);
                      if (e.key === 'Escape') setEditing(null);
                    }}
                    className="text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 w-full max-w-[180px]"
                  />
                ) : (
                  <button
                    onClick={() => startEdit(item)}
                    className="text-sm font-medium text-gray-800 hover:text-blue-600 text-left"
                    title="點擊編輯名稱"
                  >
                    {item.label}
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-2">{item.path}</span>
              </div>

              {/* 整體顯示切換 */}
              <button
                onClick={() => toggleVisible(item.id)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                  item.visible
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    : 'border-gray-200 text-gray-400 bg-gray-50'
                }`}
                title={item.visible ? '點擊隱藏' : '點擊顯示'}
              >
                {item.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                {item.visible ? '顯示' : '隱藏'}
              </button>
            </div>

            {/* 角色可見性控制 */}
            <div className="mt-2 flex flex-wrap gap-1 ml-10">
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => toggleRole(item.id, role)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    item.roles.includes(role)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
