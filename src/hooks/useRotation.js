import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function useRotation(estanciaId) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  useEffect(() => {
    let alive = true, timer;
    if (!estanciaId) return;
    async function load() {
      try {
        const data = await api.get(`/estancia/${estanciaId}/rotacion`);
        if (alive) setState({ data, loading: false, error: '' });
      } catch (e) { if (alive) setState({ data: null, loading: false, error: e.message }); }
      if (alive) timer = setTimeout(load, 30000);
    }
    setState({ data: null, loading: true, error: '' });
    load();
    return () => { alive = false; clearTimeout(timer); };
  }, [estanciaId]);
  return state;
}
