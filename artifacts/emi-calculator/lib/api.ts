const domain = process.env.EXPO_PUBLIC_DOMAIN;

export const API_BASE_URL = domain
  ? `https://${domain}:8080/api`
  : "http://localhost:8080/api";
