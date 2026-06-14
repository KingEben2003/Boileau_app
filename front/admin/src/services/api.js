import axios from "axios";

// Le proxy CRA (admin/package.json) redirige "/api" vers http://127.0.0.1:8000
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

const apiClient = axios.create({ baseURL: API_BASE_URL });

// ── JWT : ajout automatique du token sur chaque requête ─────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── JWT : refresh transparent sur 401 ───────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];
const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

const clearSession = () => {
  ["admin_accessToken", "admin_refreshToken", "admin_user"].forEach((k) => localStorage.removeItem(k));
  if (window.location.pathname !== "/login") window.location.href = "/login";
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem("admin_refreshToken");
      if (!refreshToken) { clearSession(); return Promise.reject(error); }

      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/token/refresh/`, { refresh: refreshToken });
        localStorage.setItem("admin_accessToken", data.access);
        apiClient.defaults.headers.common.Authorization = `Bearer ${data.access}`;
        processQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export function toApiError(error) {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return new Error(data);
  const message =
    data?.detail || data?.error || data?.non_field_errors?.[0] ||
    error?.message || "Une erreur est survenue avec l'API.";
  const err = new Error(message);
  err.status = error?.response?.status;
  return err;
}

const get = async (url, params) => {
  try { return (await apiClient.get(url, { params })).data; }
  catch (e) { throw toApiError(e); }
};
const post = async (url, body) => {
  try { return (await apiClient.post(url, body)).data; }
  catch (e) { throw toApiError(e); }
};
const patch = async (url, body) => {
  try { return (await apiClient.patch(url, body)).data; }
  catch (e) { throw toApiError(e); }
};
const del = async (url) => {
  try { return (await apiClient.delete(url)).data; }
  catch (e) { throw toApiError(e); }
};

// Envoi multipart/form-data (ex : upload de fichiers audio). On laisse axios
// définir lui-même l'en-tête Content-Type (avec la boundary).
const postFormData = async (url, formData) => {
  try { return (await apiClient.post(url, formData)).data; }
  catch (e) { throw toApiError(e); }
};

/* ════════════════════════════════════════════════════════════════════════════
   AUTHENTIFICATION
   ════════════════════════════════════════════════════════════════════════════ */
export async function adminLogin(username, password) {
  const { access, refresh } = await post("/token/", { username, password });
  localStorage.setItem("admin_accessToken", access);
  localStorage.setItem("admin_refreshToken", refresh);
  const me = await get("/me/");
  return me;
}

export const getMe = () => get("/me/");

export function adminLogout() {
  ["admin_accessToken", "admin_refreshToken", "admin_user"].forEach((k) => localStorage.removeItem(k));
}

/* ════════════════════════════════════════════════════════════════════════════
   TABLEAU DE BORD — KPIs
   Endpoint backend attendu : GET /api/admin/stats/
   → { users_total, users_today, active_users_7d, quizzes_today, quizzes_total,
       documents_total, summaries_total, avg_score_today, signups_7d: [{date,count}],
       quizzes_7d: [{date,count}] }
   ════════════════════════════════════════════════════════════════════════════ */
export const getAdminStats = () => get("/admin/stats/");

/* ════════════════════════════════════════════════════════════════════════════
   UTILISATEURS — GET/PATCH/DELETE /api/admin/users/
   ════════════════════════════════════════════════════════════════════════════ */
export const listUsers = (params) => get("/admin/users/", params);
export const getUser = (id) => get(`/admin/users/${id}/`);
export const updateUser = (id, body) => patch(`/admin/users/${id}/`, body);
export const deleteUser = (id) => del(`/admin/users/${id}/`);
export const setUserActive = (id, is_active) => patch(`/admin/users/${id}/`, { is_active });
export const setUserStaff = (id, is_staff) => patch(`/admin/users/${id}/`, { is_staff });

/* ════════════════════════════════════════════════════════════════════════════
   DOCUMENTS — GET/DELETE /api/admin/documents/
   ════════════════════════════════════════════════════════════════════════════ */
export const listDocuments = (params) => get("/admin/documents/", params);
export const deleteDocument = (id) => del(`/admin/documents/${id}/`);

/* ════════════════════════════════════════════════════════════════════════════
   QUIZ & RÉSULTATS — GET /api/admin/quizzes/ , /api/admin/results/
   ════════════════════════════════════════════════════════════════════════════ */
export const listQuizzes = (params) => get("/admin/quizzes/", params);
export const listResults = (params) => get("/admin/results/", params);

/* ════════════════════════════════════════════════════════════════════════════
   RÉSUMÉS — GET /api/admin/summaries/
   ════════════════════════════════════════════════════════════════════════════ */
export const listSummaries = (params) => get("/admin/summaries/", params);

/* ════════════════════════════════════════════════════════════════════════════
   CULTURE GÉNÉRALE — CRUD /api/admin/culture-questions/
   ════════════════════════════════════════════════════════════════════════════ */
export const listCultureQuestions = (params) => get("/admin/culture-questions/", params);
export const createCultureQuestion = (body) => post("/admin/culture-questions/", body);
export const updateCultureQuestion = (id, body) => patch(`/admin/culture-questions/${id}/`, body);
export const deleteCultureQuestion = (id) => del(`/admin/culture-questions/${id}/`);
export const listCultureResults = (params) => get("/admin/culture-results/", params);

/* ════════════════════════════════════════════════════════════════════════════
   AMIS — GET /api/admin/friend-requests/
   ════════════════════════════════════════════════════════════════════════════ */
export const listFriendRequests = (params) => get("/admin/friend-requests/", params);

/* ════════════════════════════════════════════════════════════════════════════
   SRS — GET /api/admin/srs-cards/
   ════════════════════════════════════════════════════════════════════════════ */
export const listSRSCards = (params) => get("/admin/srs-cards/", params);

/* ════════════════════════════════════════════════════════════════════════════
   SONS DU JEU — GET/POST/DELETE /api/admin/game-sounds/
   ════════════════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════════════════
   PARAMÈTRES DU JEU — GET/PUT /api/admin/game-settings/
   ════════════════════════════════════════════════════════════════════════════ */
export const getGameSettings = () => get("/admin/game-settings/");
export const updateGameSettings = (body) => {
  // petit wrapper PUT (apiClient.put renvoie .data)
  return apiClient.put("/admin/game-settings/", body).then((r) => r.data).catch((e) => { throw toApiError(e); });
};

export const listGameSounds = () => get("/admin/game-sounds/");
export const uploadGameSound = ({ key, audio, label, is_active = true }) => {
  const fd = new FormData();
  fd.append("key", key);
  fd.append("audio", audio);
  if (label) fd.append("label", label);
  fd.append("is_active", is_active ? "true" : "false");
  return postFormData("/admin/game-sounds/", fd);
};
export const deleteGameSound = (key) => del(`/admin/game-sounds/${key}/`);

/* ════════════════════════════════════════════════════════════════════════════
   DEMANDES DE FONCTIONNALITÉ PDF
   ════════════════════════════════════════════════════════════════════════════ */
export const listFeatureRequests = (params) => get("/admin/feature-requests/", params);
export const handleFeatureRequest = (id, action, reason = "") =>
  post(`/admin/feature-requests/${id}/handle/`, { action, reason });

export default apiClient;
