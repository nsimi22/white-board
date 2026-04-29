import axios from 'axios';

export interface AuthResponse {
  token: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthStatus {
  configured: boolean;
  smtpConfigured: boolean;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from?: string;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const res = await axios.get('/api/auth/status');
  return res.data as AuthStatus;
}

export async function setupPassword(email: string, password: string): Promise<AuthResponse> {
  const res = await axios.post('/api/auth/setup', { email, password });
  return res.data as AuthResponse;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await axios.post('/api/auth/login', { email, password });
  return res.data as AuthResponse;
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await axios.post(
    '/api/auth/change-password',
    { currentPassword, newPassword },
    { headers: authHeaders(token) }
  );
}

export async function decryptEmailPayload(
  token: string,
  encrypted: string,
  key: string,
  iv: string
): Promise<string> {
  const res = await axios.post(
    '/api/auth/decrypt',
    { encrypted, key, iv },
    { headers: authHeaders(token) }
  );
  return (res.data as { decrypted: string }).decrypted;
}

export async function saveSmtp(token: string, cfg: SmtpConfig): Promise<void> {
  await axios.post('/api/auth/smtp', cfg, { headers: authHeaders(token) });
}

export async function testSmtp(token: string): Promise<void> {
  await axios.post('/api/auth/smtp/test', {}, { headers: authHeaders(token) });
}
