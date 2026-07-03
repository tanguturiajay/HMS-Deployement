export const environment = {
  production: true,
  // Same origin since Vercel rewrites /api to the backend so the refresh cookie stays first party instead of being dropped cross site
  apiUrl: '/api',
};
