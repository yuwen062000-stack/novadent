// M-01 AuthService — 串接 NestJS 後端 API
import { AuthUser } from '../types';

const API_BASE = '/api'; // Vite proxy 或同域部署時直接用 /api

// ── 內部工具 ──────────────────────────────────────────────────

// Access Token 存 memory（不放 localStorage 避免 XSS）
let _accessToken: string | null = null;

function setToken(token: string) { _accessToken = token; }
function getToken(): string | null { return _accessToken; }
function clearToken() { _accessToken = null; }

/** 通用 fetch，自動帶 Bearer token + credentials（Refresh Cookie）*/
async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  return fetch(API_BASE + path, {
    ...options,
    headers,
    credentials: 'include',
  });
}

// ── 型別 ──────────────────────────────────────────────────────
export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// ── API 函式 ──────────────────────────────────────────────────

/**
 * 登入 → 取得 Access Token（記憶體）+ Refresh Token（HttpOnly Cookie）
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.message || '帳號或密碼錯誤' };
    }

    const data = await res.json();
    setToken(data.accessToken);

    const user: AuthUser = {
      id:                  data.user.id,
      email:               data.user.email,
      name:                data.user.name,
      role:                data.user.role,
      forceChangePassword: data.user.forceChangePassword,
    };

    // 備份到 sessionStorage，讓頁面重整時能還原（搭配 refreshAccessToken）
    sessionStorage.setItem('novadent_user', JSON.stringify(user));
    return { success: true, user };
  } catch {
    return { success: false, error: '無法連線至伺服器，請稍後再試' };
  }
}

/**
 * 會員自助註冊
 */
export async function register(name: string, email: string, password: string, phone: string): Promise<LoginResult> {
  try {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.message || '註冊失敗' };
    }

    const data = await res.json();
    setToken(data.accessToken);

    const user: AuthUser = {
      id:                  data.user.id,
      email:               data.user.email,
      name:                data.user.name,
      role:                data.user.role,
      forceChangePassword: data.user.forceChangePassword,
    };

    sessionStorage.setItem('novadent_user', JSON.stringify(user));
    return { success: true, user };
  } catch {
    return { success: false, error: '無法連線至伺服器，請稍後再試' };
  }
}

/**
 * 登出 → 清除 Refresh Cookie
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
    sessionStorage.removeItem('novadent_user');
  }
}

/**
 * 頁面重整後用 Refresh Cookie 換新 Access Token
 * 在 App 啟動時呼叫（如果 sessionStorage 有 user）
 */
export async function refreshAccessToken(): Promise<AuthUser | null> {
  try {
    const res = await apiFetch('/auth/refresh', { method: 'POST' });
    if (!res.ok) {
      sessionStorage.removeItem('novadent_user');
      return null;
    }
    const data = await res.json();
    setToken(data.accessToken);
    const user: AuthUser = {
      id:                  data.user.id,
      email:               data.user.email,
      name:                data.user.name,
      role:                data.user.role,
      forceChangePassword: data.user.forceChangePassword,
    };
    sessionStorage.setItem('novadent_user', JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

/**
 * 取得目前登入用戶（從 sessionStorage 快取讀取）
 */
export function getCurrentUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem('novadent_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 忘記密碼：防 email 探測，無論結果都回傳成功
 */
export async function forgotPassword(email: string): Promise<void> {
  await apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * 重設密碼（token 來自 email 連結 / console.log）
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.message || '連結已失效，請重新申請' };
    }
    return { success: true };
  } catch {
    return { success: false, error: '無法連線至伺服器' };
  }
}

// ── 匯出 apiFetch 供頁面元件使用 ──────────────────────────────
export { apiFetch };

/**
 * 強制修改密碼（首次登入）
 */
export async function changePassword(
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.message || '密碼修改失敗' };
    }
    // 更新 session 快取
    const user = getCurrentUser();
    if (user) {
      sessionStorage.setItem('novadent_user', JSON.stringify({ ...user, forceChangePassword: false }));
    }
    return { success: true };
  } catch {
    return { success: false, error: '無法連線至伺服器' };
  }
}

/** 密碼強度驗證：最少 8 碼，含大小寫 + 數字 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return '密碼至少需要 8 個字元';
  if (!/[A-Z]/.test(password)) return '密碼需包含至少一個大寫字母';
  if (!/[a-z]/.test(password)) return '密碼需包含至少一個小寫字母';
  if (!/[0-9]/.test(password)) return '密碼需包含至少一個數字';
  return null;
}
