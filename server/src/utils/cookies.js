const isProduction = process.env.NODE_ENV === 'production';

export const AUTH_COOKIE_NAME = 'wanderplan_token';

export const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}
