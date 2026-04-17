// M-01 AuthService — 串接 NestJS 後端 API
import { AuthUser } from '../types';

const API_BASE = '/api';

// ── 內部工具 ──────────────────────────────────────────────────

let _accessToken: string | null = null;

function setToken(token: string) { _accessToken = token; }
function getToken(): string | null { return _accessToken; }
function clearToken() { _accessToken = null; }

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function setRefreshToken(token: string) {
  try { localStorage.setItem('novadent_rt', token); } catch {}
  setCookie('novadent_rt', token, 7);
}
function getRefreshToken(): string | null {
  try {
    const ls = localStorage.getItem('novadent_rt');
    if (ls) return ls;
  } catch {}
  return getCookie('novadent_rt');
}
function clearRefreshToken() {
  try { localStorage.removeItem('novadent_rt'); } catch {}
  deleteCookie('novadent_rt');
}

let _refreshing: Promise<AuthUser | null> | null = null;

async function apiFetch(path: string, options: RequestInit = {}, _retry = false): Promise<Response> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  const res = await fetch(API_BASE + path, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !_retry && !path.startsWith('/auth/')) {
    if (!_refreshing) {
      _refreshing = refreshAccessToken().finally(() => { _refreshing = null; });
    }
    const user = await _refreshing;
    if (user && _accessToken) {
      return apiFetch(path, options, true);
    }
  }

  return res;
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
    console.log('[AUTH] login response has refreshToken:', !!data.refreshToken, 'length:', data.refreshToken?.length);
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    console.log('[AUTH] stored RT in localStorage, verify:', !!getRefreshToken());

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

export async function register(name: string, email: string, password: string, phone?: string, birthday?: string): Promise<LoginResult> {
  try {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone, birthday }),
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
    console.log('[AUTH] refreshAccessToken called, has local RT:', !!rt);

    const res = await apiFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt || undefined }),
      credentials: 'include',
    } as RequestInit);
    console.log('[AUTH] refresh response status:', res.status);
    if (!res.ok) {
      console.log('[AUTH] refresh response not ok, clearing tokens');
      clearRefreshToken();
      sessionStorage.removeItem('novadent_user');
      return null;
    }
    const data = await res.json();
    console.log('[AUTH] refresh response data.success:', data.success, 'has user:', !!data.user);
    if (!data.success) {
      console.log('[AUTH] refresh returned success=false:', data.message);
      clearRefreshToken();
      sessionStorage.removeItem('novadent_user');
      return null;
    }
    setToken(data.accessToken);
    // ⚠️ Token Rotation 修正：後端每次 refresh 都會產生新的 refreshToken（舊的已刪除）
    // 必須把新的 refreshToken 存回 localStorage，否則下次 AT 過期時會拿舊 RT 去換 → 401 → 變 GUEST
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
    const user: AuthUser = {
      id:                  data.user.id,
      email:               data.user.email,
      name:                data.user.name,
      role:                data.user.role,
      forceChangePassword: data.user.forceChangePassword,
    };
    sessionStorage.setItem('novadent_user', JSON.stringify(user));
    console.log('[AUTH] refresh success, user:', user.email, 'role:', user.role);
    return user;
  } catch (err) {
    console.error('[AUTH] refresh exception:', err);
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
