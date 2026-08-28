import axios from "axios";

// "localhost" only resolves to the machine running the browser, so a phone opening
// the dev frontend via a LAN IP (e.g. http://192.168.1.5:3000) must call the backend
// on that same host, not "localhost". Fall back to the current page's hostname.
function resolveBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8080/api`;
  }
  return "http://localhost:8080/api";
}

const baseURL = resolveBaseUrl();

export const api = axios.create({
  baseURL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("garage_access_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRetryExempt = /\/auth\/(login|refresh|logout|forgot-password)/.test(original?.url ?? "");
    if ((error.response?.status === 401 || error.response?.status === 403) && !original?._retry && !isAuthRetryExempt) {
      original._retry = true;
      const refreshed = await axios.post(`${baseURL}/auth/refresh`, null, { withCredentials: true });
      const token = refreshed.data.data.accessToken;
      sessionStorage.setItem("garage_access_token", token);
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);
