const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  submitQuery: (raw_text: string, location_text: string, session_id?: string) =>
    request<{ query_id: string; session_id: string }>('/query', {
      method: 'POST',
      body: JSON.stringify({ raw_text, location_text, session_id }),
    }),

  analyzeQuery: (queryId: string) =>
    request<any>(`/query/${queryId}/analyze`, { method: 'POST' }),

  getExplanation: (queryId: string, candidateIndex = 0) =>
    request<any>(`/query/${queryId}/explain?candidate=${candidateIndex}`),

  confirmAuthority: (queryId: string, candidate_id: string) =>
    request<any>(`/query/${queryId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ candidate_id }),
    }),

  searchAuthorities: (q?: string, domain?: string, state?: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (domain) params.set('domain', domain);
    if (state) params.set('state', state);
    return request<any>(`/authorities/search?${params}`);
  },

  submitFeedback: (query_id: string | null, comment: string) =>
    request<any>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ query_id, comment }),
    }),
};
