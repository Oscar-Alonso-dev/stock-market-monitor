// cache.js — Caché compartida entre todos los componentes
// TTL en ms. Evita refetch al navegar entre pantallas.

const _store = {};

export const cacheGet = (k) => {
  const e = _store[k];
  return e && Date.now() - e.ts < e.ttl ? e.data : null;
};

export const cacheSet = (k, data, ttl = 20000) => {
  _store[k] = { data, ts: Date.now(), ttl };
};

export const cacheFetch = async (url, ttl = 20000) => {
  const hit = cacheGet(url);
  if (hit !== null) return hit;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  cacheSet(url, d, ttl);
  return d;
};

export const cacheInvalidate = (prefix) => {
  Object.keys(_store).forEach(k => { if (k.startsWith(prefix)) delete _store[k]; });
};
