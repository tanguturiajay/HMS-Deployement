export const environment = {
  production: false,
  // Same origin since ng serve proxies /api to localhost matching the production rewrite so the refresh cookie stays first party
  apiUrl: '/api',
};
