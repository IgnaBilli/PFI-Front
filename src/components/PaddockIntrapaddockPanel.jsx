import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';
import IntrapaddockAnalysis from './IntrapaddockAnalysis.jsx';

export default function PaddockIntrapaddockPanel({ paddockId }) {
  return <Panel key={paddockId} paddockId={paddockId} />;
}

function Panel({ paddockId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const submitting = useRef(false);
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    let cancelled = false, timer;
    async function load() {
      try {
        const result = await api.get(`/potrero/${paddockId}/intrapotrero`);
        if (cancelled) return;
        setAnalysis(result.analysis ?? null);
        const busy = result.task?.estado === 'EJECUTANDO';
        setRunning(busy);
        setError(result.task?.estado === 'ERROR' ? result.task.error || 'No se pudo actualizar el análisis.' : '');
        if (busy) timer = setTimeout(load, 5000);
      } catch (err) {
        if (!cancelled) { setError(err.message || 'No se pudo consultar el análisis.'); setRunning(false); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [paddockId, revision]);

  async function refresh() {
    if (submitting.current) return;
    submitting.current = true;
    setError('');
    setRunning(true);
    try {
      await api.post(`/potrero/${paddockId}/intrapotrero`);
      if (mounted.current) setRevision(value => value + 1);
    } catch (err) {
      if (mounted.current) { setError(err.message || 'No se pudo iniciar el análisis.'); setRunning(false); }
    } finally { submitting.current = false; }
  }

  return <div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-sand-300">Vegetación dentro del potrero · Sentinel-2</p>
      <button type="button" className="app-button-secondary" disabled={loading || running} onClick={refresh}>
        {loading || running ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
        {running ? 'Analizando imágenes…' : analysis ? 'Actualizar análisis' : 'Generar análisis'}
      </button>
    </div>
    {running && <p role="status" className="mt-3 text-sm text-sand-300">La consulta satelital puede tardar varios minutos. Podés seguir usando el sistema; el resultado se guarda al terminar.</p>}
    {error && <p role="alert" className="app-error mt-3">{error}</p>}
    {analysis && !analysis.processingRevision && <p role="status" className="mt-3 text-sm text-warning-400">Este análisis se calculó con una versión anterior que podía descartar píxeles válidos. Actualizá el análisis para corregir la cobertura y los valores de NDVI.</p>}
    {loading ? <div role="status" className="app-panel mt-4 p-6 text-sand-300">Consultando análisis guardado…</div> : <IntrapaddockAnalysis key={analysis?.generatedAt ?? 'empty'} data={analysis} />}
  </div>;
}
