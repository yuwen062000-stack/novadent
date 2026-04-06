// M-01 AuthService — 串接 NestJS 後端 API
import { AuthUser } from '../types';

const API_BASE = '/api';

// ── 內部工具 ──────────────────────────────────────────────────

let _accessToken: string | null = null;

function setToken(token: string) { _accessToken = token; }
function getToken(): string | null { return _accessToken; }
function clearToken() { _accessToken = null; }

function setRefreshToken(token: string) { localStorage.setItem('novadent_rt', token); }
function getRefreshToken(): string | null { return localStorage.getItem('novadent_rt'); }
function clearRefreshToken() { localStorage.removeItem('novadent_rt'); }

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
    setRefreshToken(data.refreshToken);

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
    setRefreshToken(data.refreshToken);

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

export async function logout(): Promise<void> {
  try {
    const rt = getRefreshToken();
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt }),
    });
  } finally {
    clearToken();
    clearRefreshToken();
    sessionStorage.removeItem('novadent_user');
  }
}

export async function refreshAccessToken(): Promise<AuthUser | null> {
  try {
    const rt = getRefreshToken();
    if (!rt) return null;

    const res = await apiFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) {
      clearRefreshToken();
      sessionStorage.removeItem('novadent_user');
      return null;
    }
    const data = await res.json();
    if (!data.success) {
      clearRefreshToken();
      sessionStorage.removeItem('novadent_user');
      return null;
    }
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

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem('novadent_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

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
    const user = getCurrentUser();
    if (user) {
      sessionStorage.setItem('novadent_user', JSON.stringify({ ...user, forceChangePassword: false }));
    }
    return { success: true };
  } catch {
    return { success: false, error: '無法連線至伺服器' };
  }
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return '密碼至少需要 8 個字元';
  if (!/[A-Z]/.test(password)) return '密碼需包含至少一個大寫字母';
  if (!/[a-z]/.test(password)) return '密碼需包含至少一個小寫字母';
  if (!/[0-9]/.test(password)) return '密碼需包含至少一個數字';
  return null;
}
