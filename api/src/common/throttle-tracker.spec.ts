import {
  readJwtSubFromAccessCookie,
  resolveThrottleTracker,
} from './throttle-tracker';

describe('resolveThrottleTracker', () => {
  it('privilégie le sub utilisateur quand il est connu', () => {
    expect(
      resolveThrottleTracker({ userSub: 'user-1', ip: '1.2.3.4' }),
    ).toBe('user:user-1');
  });

  it('retombe sur l’IP si pas d’utilisateur', () => {
    expect(resolveThrottleTracker({ ip: '1.2.3.4' })).toBe('ip:1.2.3.4');
  });

  it('utilise unknown si ni user ni IP', () => {
    expect(resolveThrottleTracker({})).toBe('ip:unknown');
  });
});

describe('readJwtSubFromAccessCookie', () => {
  function encodePayload(payload: object): string {
    const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `hdr.${json}.sig`;
  }

  it('extrait sub depuis le cookie d’accès', () => {
    const token = encodePayload({ sub: 'abc-123', exp: 9999999999 });
    const header = `other=1; token=${token}; refresh_token=x`;
    expect(readJwtSubFromAccessCookie(header, 'token')).toBe('abc-123');
  });

  it('retourne undefined si cookie absent ou JWT invalide', () => {
    expect(readJwtSubFromAccessCookie('a=1', 'token')).toBeUndefined();
    expect(
      readJwtSubFromAccessCookie('token=not-a-jwt', 'token'),
    ).toBeUndefined();
  });
});
