const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

function buildUrl(path) {
  // In dev, Vite proxy handles relative "/api" paths.
  // In prod, set VITE_API_BASE="https://your-backend.onrender.com"
  if (!API_BASE) return `/api${path}`;
  return `${API_BASE}/api${path}`;
}

async function request(path, options = {}) {
  const url = buildUrl(path);
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}

export const api = {
  energy: {
    getHouses: () => request("/energy/houses"),
    getHouse: (id) => request(`/energy/houses/${id}`),
    getStats: () => request("/energy/stats"),
    update: (houses) => request("/energy/update", { method: "POST", body: JSON.stringify({ houses }) }),
  },
  listings: {
    getAll: () => request("/listings"),
    getById: (id) => request(`/listings/${id}`),
    create: (body) => request("/listings", { method: "POST", body: JSON.stringify(body) }),
    cancel: (id) => request(`/listings/${id}`, { method: "DELETE" }),
    suggestPrice: (surplus) => request(`/listings/price/suggest?surplus=${surplus}`),
  },
  trades: {
    getAll: (limit = 50) => request(`/trades?limit=${limit}`),
    getById: (id) => request(`/trades/${id}`),
    getByHouse: (houseId) => request(`/trades/house/${houseId}`),
    execute: (listingId, buyerHouseId) =>
      request("/trades/execute", {
        method: "POST",
        body: JSON.stringify({ listingId, buyerHouseId }),
      }),
  },
  analytics: {
    get: () => request("/analytics"),
    getPerformance: () => request("/analytics/performance"),
  },
  health: () => fetch(API_BASE ? `${API_BASE}/health` : "/health").then((r) => r.json()),
};
