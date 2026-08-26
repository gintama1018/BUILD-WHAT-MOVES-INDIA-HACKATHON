import { useState, useCallback } from 'react';
import { api } from '../api-client';

export type Step = 'search' | 'loading' | 'understanding' | 'results' | 'why' | 'confirm' | 'filing';

export interface AppState {
  step: Step;
  query_id: string | null;
  session_id: string | null;
  raw_text: string;
  location_text: string;
  analysis: any | null;
  selectedCandidate: any | null;
  selectedCandidateIndex: number;
  explanation: string | null;
  error: string | null;
  ai_available: boolean;
}

const initial: AppState = {
  step: 'search',
  query_id: null,
  session_id: null,
  raw_text: '',
  location_text: '',
  analysis: null,
  selectedCandidate: null,
  selectedCandidateIndex: 0,
  explanation: null,
  error: null,
  ai_available: true,
};

export function useRtiFlow() {
  const [state, setState] = useState<AppState>(initial);

  const update = useCallback((patch: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  const submitQuery = useCallback(async (raw_text: string, location_text: string) => {
    update({ step: 'loading', error: null, raw_text, location_text });
    try {
      const { query_id, session_id } = await api.submitQuery(raw_text, location_text, state.session_id ?? undefined);
      const analysis = await api.analyzeQuery(query_id);
      update({
        query_id,
        session_id,
        analysis,
        ai_available: analysis.ai_available,
        step: analysis.candidates?.length > 0 ? 'understanding' : 'results',
      });
    } catch (err: any) {
      update({ step: 'search', error: err.message ?? 'Something went wrong. Please try again.' });
    }
  }, [state.session_id, update]);

  const proceedToResults = useCallback(() => {
    update({ step: 'results' });
  }, [update]);

  const selectCandidate = useCallback(async (candidate: any, index: number) => {
    update({ selectedCandidate: candidate, selectedCandidateIndex: index, step: 'loading', explanation: null });
    try {
      const { explanation } = await api.getExplanation(state.query_id!, index);
      update({ explanation, step: 'why' });
    } catch {
      // Fallback explanation from candidate data
      const fallback = `${candidate.name} is the ${candidate.government_level} government authority for this type of query. File at ${candidate.portal_url}. Fee: ₹${candidate.fee_amount}.`;
      update({ explanation: fallback, step: 'why' });
    }
  }, [state.query_id, update]);

  const confirmAuthority = useCallback(async (candidateId: string) => {
    try {
      await api.confirmAuthority(state.query_id!, candidateId);
    } catch { /* non-blocking — proceed anyway */ }
    update({ step: 'filing' });
  }, [state.query_id, update]);

  const goBack = useCallback((to: Step) => {
    update({ step: to, error: null });
  }, [update]);

  const reset = useCallback(() => setState({ ...initial, session_id: state.session_id }), [state.session_id]);

  return { state, submitQuery, proceedToResults, selectCandidate, confirmAuthority, goBack, reset };
}
