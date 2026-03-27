const BASE = "/api";

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
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
  health: () => fetch("/health").then((r) => r.json()),
};
