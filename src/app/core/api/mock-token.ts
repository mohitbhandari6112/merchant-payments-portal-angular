export type MockTokenKind = 'access' | 'refresh';

export interface MockTokenPayload {
  sub: string;
  kind: MockTokenKind;
  exp: number;
  jti: string;
}

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const ACCESS_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_MS / 1000;

export function encodeMockToken(payload: MockTokenPayload): string {
  return `mock.${btoa(JSON.stringify(payload))}`;
}

export function createMockToken(kind: MockTokenKind, userId: string, expiresAt: number): string {
  return encodeMockToken({
    sub: userId,
    kind,
    exp: expiresAt,
    jti: crypto.randomUUID(),
  });
}

export function decodeMockToken(token: string): MockTokenPayload | null {
  if (!token.startsWith('mock.')) {
    return null;
  }

  try {
    const decoded = JSON.parse(atob(token.slice(5))) as Partial<MockTokenPayload>;

    if (
      typeof decoded.sub !== 'string' ||
      (decoded.kind !== 'access' && decoded.kind !== 'refresh') ||
      typeof decoded.exp !== 'number' ||
      typeof decoded.jti !== 'string'
    ) {
      return null;
    }

    return {
      sub: decoded.sub,
      kind: decoded.kind,
      exp: decoded.exp,
      jti: decoded.jti,
    };
  } catch {
    return null;
  }
}
