import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

// withCredentials: true — browser sends httpOnly cookies on every request (same-site)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh cookie is sent automatically via withCredentials — no body needed.
        await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {}, { withCredentials: true });
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function toApiError(error) {
  const fallbackMessage = "Une erreur est survenue avec l'API.";
  const data = error?.response?.data;

  if (!data) return new Error(fallbackMessage);
  if (typeof data === "string" && data.trim()) return new Error(data);

  // DRF standard error fields
  if (data.detail) return new Error(data.detail);
  if (data.error) return new Error(data.error);
  if (data.non_field_errors?.[0]) return new Error(data.non_field_errors[0]);

  // Field-level validation errors: pick the first message from any field
  for (const val of Object.values(data)) {
    if (Array.isArray(val) && val[0]) return new Error(String(val[0]));
    if (typeof val === "string" && val) return new Error(val);
  }

  return new Error(fallbackMessage);
}

/**
 * Sons du jeu (musique + effets) configurés par l'admin.
 * Endpoint public (comme /public-config/) : pas besoin de token.
 * Renvoie { background_music, correct, wrong, win, lose } avec des URL ou null.
 */
export async function getGameSounds() {
  try {
    const response = await axios.get(`${API_BASE_URL}/game-sounds/`);
    return response.data;
  } catch {
    return { background_music: null, correct: null, wrong: null, win: null, lose: null };
  }
}

/** Réglages publics du jeu (compte à rebours + défauts multijoueur). */
export async function getGameSettings() {
  try {
    const response = await axios.get(`${API_BASE_URL}/game-settings/`);
    return response.data;
  } catch {
    return { countdown_seconds: 30, mp_num_questions: 10, mp_themes: [], mp_types: ["qcm", "true_false"], mp_difficulty: "medium", mp_end_condition: "best_score" };
  }
}

/** Questions de jeu (Solo & Culture) tirées de la banque admin, filtrées. */
export async function getGameQuestions({ themes = [], types = [], difficulty = "", count = 10 } = {}) {
  const params = {};
  if (themes.length) params.themes = themes.join(",");
  if (types.length) params.types = types.join(",");
  if (difficulty) params.difficulty = difficulty;
  params.count = count;
  try {
    const response = await apiClient.get("/game/questions/", { params });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getDocuments() {
  try {
    const response = await apiClient.get("/documents/");
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await apiClient.post("/documents/", formData);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function generateSummary(documentId, type = "brief") {
  try {
    const response = await apiClient.post("/summaries/generate/", {
      document_id: documentId,
      type,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function generateQuiz(documentId, { type = "qcm", difficulty = "medium", numberOfQuestions = 5 } = {}) {
  try {
    const response = await apiClient.post("/quizzes/generate/", {
      document_id: documentId,
      type,
      difficulty,
      number_of_questions: numberOfQuestions,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getSummaries(documentId) {
  try {
    const response = await apiClient.get("/summaries/", {
      params: { document_id: documentId },
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getQuizzes(documentId) {
  try {
    const response = await apiClient.get("/quizzes/", {
      params: { document_id: documentId },
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getQuiz(quizId) {
  try {
    const response = await apiClient.get(`/quizzes/${quizId}/`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getDocument(documentId) {
  try {
    const response = await apiClient.get(`/documents/${documentId}/`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function reextractDocument(documentId) {
  try {
    const response = await apiClient.post(`/documents/${documentId}/reextract/`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deleteDocument(documentId) {
  try {
    await apiClient.delete(`/documents/${documentId}/`);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getUserProfile() {
  try {
    const response = await apiClient.get("/me/");
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function submitQuizResult(quizId, { score, time_spent_seconds, answers_detail }) {
  try {
    const response = await apiClient.post(`/quizzes/${quizId}/submit/`, {
      score,
      time_spent_seconds,
      answers_detail,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getAnalyticsSummary() {
  try {
    const response = await apiClient.get('/analytics/summary/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getAnalyticsProgression() {
  try {
    const response = await apiClient.get('/analytics/progression/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getAnalyticsDashboard() {
  try {
    const response = await apiClient.get('/analytics/dashboard/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getAIWeaknesses() {
  try {
    const response = await apiClient.get('/ai/weaknesses/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getDailyChallenges() {
  try {
    const response = await apiClient.get('/analytics/daily-challenges/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getSRSDue() {
  try {
    const response = await apiClient.get('/srs/due/');
    return Array.isArray(response.data) ? response.data : (response.data?.items ?? []);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateSRS(document_id, score) {
  try {
    const response = await apiClient.post('/srs/update/', { document_id, score });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/* ─── Amis ────────────────────────────────────────────────────────── */
export async function getFriends() {
  try {
    const response = await apiClient.get('/friends/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getFriendRequests() {
  try {
    const response = await apiClient.get('/friends/requests/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function sendFriendRequest({ pseudo, email }) {
  try {
    const payload = pseudo ? { pseudo } : { email };
    const response = await apiClient.post('/friends/request/', payload);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function acceptFriendRequest(requestId) {
  try {
    const response = await apiClient.post(`/friends/requests/${requestId}/accept/`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function declineFriendRequest(requestId) {
  try {
    const response = await apiClient.post(`/friends/requests/${requestId}/decline/`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function addFriend({ pseudo, email }) {
  try {
    const payload = pseudo ? { pseudo } : { email };
    const response = await apiClient.post('/friends/add/', payload);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function removeFriend(friendId) {
  try {
    await apiClient.delete(`/friends/${friendId}/`);
  } catch (error) {
    throw toApiError(error);
  }
}

/** Envoie un défi à un ami sur un quiz précis (depuis la page de résultats). */
export async function sendChallenge(friendId, quizId, { score, answersDetail }) {
  try {
    const response = await apiClient.post('/challenges/send/', {
      friend_id: friendId,
      quiz_id: quizId,
      score,
      answers_detail: answersDetail,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getChallenges() {
  try {
    const response = await apiClient.get('/challenges/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getChallengeDetail(challengeId) {
  try {
    const response = await apiClient.get(`/challenges/${challengeId}/`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function acceptChallenge(challengeId) {
  try {
    const response = await apiClient.post(`/challenges/${challengeId}/accept/`);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function refuseChallenge(challengeId) {
  try {
    await apiClient.post(`/challenges/${challengeId}/refuse/`);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function submitChallengeAnswers(challengeId, { score, answersDetail }) {
  try {
    const response = await apiClient.post(`/challenges/${challengeId}/submit/`, {
      score,
      answers_detail: answersDetail,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/* ─── Notifications internes ──────────────────────────────────────────── */
export async function getNotifications() {
  try {
    const response = await apiClient.get('/notifications/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function markNotificationsRead() {
  try {
    await apiClient.post('/notifications/read/');
  } catch {
    // non-bloquant
  }
}

export async function getUnreadNotificationCount() {
  try {
    const response = await apiClient.get('/notifications/unread-count/');
    return response.data.count ?? 0;
  } catch {
    return 0;
  }
}

/* ─── Web Push (OneSignal) ────────────────────────────────────────── */
export async function syncOneSignalPlayer(playerId) {
  try {
    const response = await apiClient.post('/push/register-player/', {
      onesignal_player_id: playerId,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/* ─── Culture générale ────────────────────────────────────────────── */
export async function getCultureThemes() {
  try {
    const response = await apiClient.get('/culture/themes/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getCultureQuestions(themeKey) {
  try {
    const response = await apiClient.get(`/culture/questions/`, {
      params: { theme: themeKey },
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function submitCultureResult(themeKey, { score, answers }) {
  try {
    const response = await apiClient.post('/culture/submit/', {
      theme: themeKey,
      score,
      answers,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getCultureLeaderboard(themeKey) {
  try {
    const response = await apiClient.get('/culture/leaderboard/', {
      params: { theme: themeKey },
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/* ─── Demande d'activation fonctionnalité PDF ─────────────────────── */
export async function sendFeatureRequest() {
  try {
    const response = await apiClient.post('/feature-request/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getFeatureRequestStatus() {
  try {
    const response = await apiClient.get('/feature-request/status/');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/* ─── Défi PDF ────────────────────────────────────────────────────── */
export async function generateQuizForChallenge(documentId, { type = 'qcm', difficulty = 'medium', numberOfQuestions = 10 } = {}) {
  try {
    const response = await apiClient.post('/quizzes/generate/', {
      document_id: documentId,
      type,
      difficulty,
      number_of_questions: numberOfQuestions,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function sendPdfChallenge(friendId, quizId, { score, answersDetail, timeSpentSeconds } = {}) {
  try {
    const response = await apiClient.post('/challenges/send/', {
      opponent_id: friendId,
      quiz_id: quizId,
      score,
      answers_detail: answersDetail,
      time_spent_seconds: timeSpentSeconds,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}
