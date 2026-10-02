import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import ConfirmDialog from './ConfirmDialog';

export default function PaddockUseControl({ id, name, enabled = true, animals = 0, onChanged, disabled = false, className = 'mt-3' }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save() {
    setBusy(true); setError('');
    try { await api.patch(`/potrero/${id}/uso`, { habilitado: !enabled }); await onChanged(); setOpen(false); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className={`${className} text-xs`}>
    {!enabled && <p className="mb-2 text-warning-400">Fuera de uso · no recibe ganado. {animals > 0 && <Link className="underline" to="/rotacion">Reorganizar {animals} animales</Link>}</p>}
    <button type="button" className="app-button-secondary text-xs" disabled={disabled || busy} onClick={() => setOpen(true)}>{enabled ? 'Desactivar potrero' : 'Reactivar potrero'}</button>
    {error && <p role="alert" className="app-error mt-2">{error}</p>}
    <ConfirmDialog isOpen={open} title={`${enabled ? 'Desactivar' : 'Reactivar'} ${name}`} loading={busy}
      message={enabled ? `El potrero dejará de recibir ganado. Sus ${animals} animales conservarán su ubicación y Rotación recomendará cómo redistribuirlos. Podés reactivarlo cuando quieras.` : 'El potrero volverá a estar disponible para recibir ganado. Si lo excluiste del análisis, volvé a incluirlo en Rotación.'}
      confirmLabel={enabled ? 'Desactivar y reorganizar' : 'Reactivar'} onConfirm={save} onCancel={() => { setOpen(false); setError(''); }} />
  </div>;
}
