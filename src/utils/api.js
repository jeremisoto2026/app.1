const API_BASE_URL = String(process.env.REACT_APP_API_BASE_URL || "").trim().replace(/\/+$/, "");

export function apiUrl(path) {
  const normalizedPath = String(path || "");
  const route = normalizedPath.startsWith("/") ? normalizedPath : "/" + normalizedPath;
  return API_BASE_URL ? API_BASE_URL + route : route;
}

export function apiFetch(path, options) {
  return fetch(apiUrl(path), options);
}
