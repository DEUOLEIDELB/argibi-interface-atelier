// grist.js — Fetch Grist API + fallback localStorage. Non bloquant.
// Si pas de clé API ou erreur réseau ou timeout 3s : on retombe sur le cache.

const GRIST_CACHE_KEY = 'argibi-atelier:grist-cache';
const TIMEOUT_MS = 3000;

let CONFIG = null;

export function configureGrist(config) {
  CONFIG = config || null;
}

export async function fetchSchool(schoolId) {
  if (!schoolId) return cached(schoolId) || null;
  // Court-circuit si Grist desactive dans config.json (cas par defaut tant
  // que les credentials ne sont pas fournis).
  if (!CONFIG?.enabled) return cached(schoolId);
  if (!CONFIG?.apiKey || !CONFIG?.docId) return cached(schoolId);

  try {
    const url = `${CONFIG.apiBase || 'https://docs.getgrist.com/api'}/docs/${CONFIG.docId}/tables/Schools/records?filter=${encodeURIComponent(JSON.stringify({ schoolId: [schoolId] }))}`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${CONFIG.apiKey}` },
      signal: ctl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Grist HTTP ${res.status}`);
    const json = await res.json();
    const record = json?.records?.[0]?.fields || null;
    if (record) cacheStore(schoolId, record);
    return record || cached(schoolId);
  } catch (err) {
    console.info('[grist] fallback localStorage:', err.message);
    return cached(schoolId);
  }
}

function cached(schoolId) {
  try {
    const raw = localStorage.getItem(GRIST_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    return cache[schoolId] || null;
  } catch {
    return null;
  }
}

function cacheStore(schoolId, record) {
  try {
    const raw = localStorage.getItem(GRIST_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[schoolId] = record;
    localStorage.setItem(GRIST_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('[grist] cache write failed.', err);
  }
}
