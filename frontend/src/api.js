
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const api = axios.create({ baseURL });

// Attach access token to protected API requests.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (!original || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Do not attempt token refresh for authentication endpoints.
    const url = original.url || "";

    const isAuthEndpoint =
      url.includes("/auth/token/") ||
      url.includes("/auth/refresh/") ||
      url.includes("/auth/change-password/");

    if (isAuthEndpoint || original._retry) {
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem("refresh");

    if (!refresh) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const { data } = await axios.post(`${baseURL}/auth/refresh/`, {
        refresh,
      });

      localStorage.setItem("access", data.access);

      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${data.access}`;

      return api(original);
    } catch (refreshError) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");

      window.location.href = "/login";

      return Promise.reject(refreshError);
    }
  }
);

export default api;
