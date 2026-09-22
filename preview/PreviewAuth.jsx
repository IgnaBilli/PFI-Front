// This module replaces AuthContext ONLY in the dedicated local Vite config.
// No session storage, credentials or API calls are used by this preview.
export function useAuth() {
  return { estancia: { nombre: 'Estancia de ejemplo' }, logout() {} };
}
