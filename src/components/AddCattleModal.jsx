import { useEffect, useId, useRef, useState } from 'react';
import { X, Plus, Calculator, LoaderCircle } from 'lucide-react';
import {
  buildCattleCreatePayload,
  CATEGORY_OPTIONS,
  CATEGORY_SEX,
  WEIGHT_RANGE_BY_CATEGORY,
  formatPhysiologicalStatus,
} from '../services/mappers.js';
import { createNutritionEstimate } from '../services/analyticsService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { generateCaravanas } from '../utils/caravana.js';
import vacaSinFondo from '../../images/vacaSinFondo.png';

const WEIGHT_RANGE_TOLERANCE_KG = 5;

// TERNERO no tiene sexo fijo por categoría (Ternero/Ternera admite los dos);
// sin selector en la UI, se registra como Macho por defecto.
const DEFAULT_TERNERO_SEX = 'M';

const STATUS_OPTIONS = [
  { value: 'L', label: 'L: Lactando (produciendo leche)' },
  { value: 'P', label: 'P: Preñada / Gestante' },
  { value: 'B', label: 'B: Seca / Vacía' },
  { value: 'N', label: 'N: Normal / No gestante ni lactante' },
  { value: 'P/L', label: 'P/L: Preñada y Lactando simultáneamente' },
  { value: 'B/L', label: 'B/L: Seca y Lactando (o transiciones)' },
  { value: 'N/P', label: 'N/P: No lactante y Preñada' },
  { value: 'DESCONOCIDO', label: 'DESCONOCIDO: Sin registro de estado' },
];

export default function AddCattleModal({
  isOpen,
  onClose,
  onAdd,
  paddocks = [],
  existingCaravanas = [],
  cattle = [],
  lockedPaddockId = null,
  lockedPaddockLabel = null,
  variant = 'modal',
}) {
  const { estancia } = useAuth();
  const [category, setCategory] = useState('VACA');
  const [quantity, setQuantity] = useState('1');
  const [previousDays, setPreviousDays] = useState('0');
  const [weight, setWeight] = useState('');
  const [cc, setCc] = useState('');
  const [status, setStatus] = useState('N');
  const [selectedPaddockId, setSelectedPaddockId] = useState('');
  const [error, setError] = useState('');
  const [weightWarning, setWeightWarning] = useState('');
  const [weightConfirmed, setWeightConfirmed] = useState(false);
  const [dmiLoading, setDmiLoading] = useState(false);
  const [dmiError, setDmiError] = useState('');
  const [dmiResult, setDmiResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const submittingRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const summaryPaddockId =
    lockedPaddockId ?? (selectedPaddockId ? Number(selectedPaddockId) : null);

  useEffect(() => {
    if (!isOpen) return;
    setCategory('VACA');
    setQuantity('1');
    setPreviousDays('0');
    setWeight('');
    setCc('');
    setStatus('N');
    setSelectedPaddockId('');
    setError('');
    setWeightWarning('');
    setWeightConfirmed(false);
    setDmiLoading(false);
    setDmiError('');
    setDmiResult(null);
    setSubmitting(false);
  }, [isOpen]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    if (!isOpen || variant === 'inline') return undefined;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const frame = requestAnimationFrame(() => {
      dialog?.querySelector('select, input, button')?.focus();
    });

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !submittingRef.current) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen, onClose, variant]);

  useEffect(() => {
    setDmiResult(null);
    setDmiError('');
  }, [summaryPaddockId]);

  if (!isOpen) return null;

  const sex = CATEGORY_SEX[category] ?? DEFAULT_TERNERO_SEX;
  const isVaca = category === 'VACA';

  const dmiByAnimalId = new Map(
    (dmiResult?.predicciones ?? []).map((p) => [String(p.animal_id), p])
  );

  async function handleCalculateDmi() {
    if (summaryPaddockId == null) return;
    setDmiLoading(true);
    setDmiError('');
    try {
      const result = await createNutritionEstimate(summaryPaddockId);
      setDmiResult(result);
    } catch (err) {
      setDmiError(err.message || 'No se pudo calcular el consumo DMI.');
    } finally {
      setDmiLoading(false);
    }
  }

  const summaryPaddockName =
    lockedPaddockLabel ?? paddocks.find((p) => String(p.id) === String(summaryPaddockId))?.name ?? '';
  const herd = summaryPaddockId != null
    ? cattle.filter((a) => String(a.paddockId) === String(summaryPaddockId))
    : [];
  const herdRows = [...herd].sort((a, b) =>
    String(a.caravana).localeCompare(String(b.caravana), 'es', { numeric: true })
  );

  const herdTotal = herd.length;
  const herdMales = herd.filter((a) => a.sex === 'M').length;
  const herdFemales = herd.filter((a) => a.sex === 'F').length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setWeightWarning('');

    const qty = parseInt(quantity, 10);
    const days = Number(previousDays);
    if (summaryPaddockId != null && (previousDays.trim() === '' || !Number.isInteger(days) || days < 0 || days > 36500)) {
      setError('Los días previos deben ser un entero entre 0 y 36500.');
      return;
    }
    if (isNaN(qty) || qty < 1) {
      setError('Ingresá una cantidad válida (mínimo 1).');
      return;
    }

    const generatedCaravanas = generateCaravanas({
      estanciaName: estancia?.nombre,
      paddockName: summaryPaddockName,
      startCount: herdTotal,
      quantity: qty,
      existingCaravanas,
    });

    const weightNumber = Number(weight);
    if (!weight.trim() || !Number.isFinite(weightNumber) || weightNumber <= 0) {
      setError('Ingresá un peso vivo válido en kg.');
      return;
    }

    const weightRange = WEIGHT_RANGE_BY_CATEGORY[category];
    const isWeightOutOfRange =
      weightRange &&
      (weightNumber < weightRange.min - WEIGHT_RANGE_TOLERANCE_KG ||
        weightNumber > weightRange.max + WEIGHT_RANGE_TOLERANCE_KG);

    if (isWeightOutOfRange && !weightConfirmed) {
      const categoryLabel = CATEGORY_OPTIONS.find((opt) => opt.value === category)?.label ?? category;
      setWeightWarning(
        `El peso ingresado (${weightNumber} kg) está fuera del rango observado para la categoría ${categoryLabel} (${weightRange.min}-${weightRange.max} kg). Hacé clic en "Confirmar y Registrar" para guardarlo de todos modos.`
      );
      setWeightConfirmed(true);
      return;
    }

    if (isVaca) {
      const numCc = parseFloat(cc);
      if (cc === '' || isNaN(numCc) || numCc < 1 || numCc > 5) {
        setError('La condición corporal es obligatoria para la categoría Vaca (escala 1.0 a 5.0).');
        return;
      }
    }

    const animals = generatedCaravanas.map((caravana) =>
      ({ ...buildCattleCreatePayload({
        caravana,
        sex,
        category,
        weight: weightNumber,
        cc: isVaca ? cc : '',
        status: isVaca ? status : 'DESCONOCIDO',
      }), ...(summaryPaddockId != null ? { dias_previos_potrero: days } : {}) })
    );

    const paddockId = lockedPaddockLabel ? null : selectedPaddockId ? Number(selectedPaddockId) : null;

    setSubmitting(true);
    try {
      await onAdd({ paddockId, animals });
    } catch (err) {
      setError(err.message || 'No se pudo agregar el ganado. Revisá los datos e intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  const content = (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src={vacaSinFondo} alt="" aria-hidden="true" className="h-11 w-14 shrink-0 object-contain opacity-70" />
          <div>
            <h3 id={titleId} className="font-display text-lg font-bold text-[var(--text)]">Agregar ganado</h3>
            <p id={descriptionId} className="text-xs text-[var(--text-muted)]">
              Ingresá los datos del rodeo a incorporar.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={submitting}
          aria-label="Cerrar formulario para agregar ganado"
          className="app-icon-button shrink-0 disabled:opacity-50">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} aria-describedby={error ? errorId : undefined} className="mt-5 space-y-4 text-sm">
          {lockedPaddockLabel ? (
            <div className="app-panel-muted px-3.5 py-2.5 text-sm text-[var(--text-soft)]">
              Se asignará al potrero <strong className="text-[var(--text)]">{lockedPaddockLabel}</strong> al
              guardar.
            </div>
          ) : (
            <div>
               <label htmlFor={`${titleId}-paddock`} className="app-label">Potrero de destino (opcional)</label>
               <select
                 id={`${titleId}-paddock`}
                value={selectedPaddockId}
                onChange={(e) => setSelectedPaddockId(e.target.value)}
                 className="app-field">
                <option value="">Sin potrero</option>
                {paddocks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {summaryPaddockId != null && <div>
            <label htmlFor={`${titleId}-previous-days`} className="app-label">Días dentro del potrero previos</label>
            <input id={`${titleId}-previous-days`} type="number" min="0" max="36500" step="1" required
              value={previousDays} onChange={e => setPreviousDays(e.target.value)} className="app-field" />
          </div>}
          <div>
             <label htmlFor={`${titleId}-category`} className="app-label">Categoría</label>
             <select
               id={`${titleId}-category`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
               className="app-field">
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${titleId}-quantity`} className="app-label">Cantidad (cabezas)</label>
              <input
                id={`${titleId}-quantity`}
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="app-field"
              />
            </div>
            <div>
              <label htmlFor={`${titleId}-weight`} className="app-label">Peso vivo (kg)</label>
              <input
                id={`${titleId}-weight`}
                type="number"
                min="0"
                step="any"
                placeholder="Ej: 380"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  setWeightWarning('');
                  setWeightConfirmed(false);
                }}
                className="app-field"
              />
            </div>
          </div>

          {isVaca ? (
            <>
              <div>
                <label htmlFor={`${titleId}-cc`} className="app-label">
                  Condición corporal{' '}
                  <span className="text-xs font-normal text-[var(--text-muted)]">(Escala 1.0 a 5.0)</span>
                </label>
                <input
                  id={`${titleId}-cc`}
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  placeholder="Ej: 3.5"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="app-field"
                />
              </div>

              <div>
                <label htmlFor={`${titleId}-status`} className="app-label">Estado fisiológico</label>
                <select
                  id={`${titleId}-status`}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="app-field">
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="app-panel-muted p-3 text-sm text-[var(--text-muted)]">
              * Para esta categoría solo se requiere Peso Vivo. La Condición Corporal y Estado
              Fisiológico no aplican.
            </div>
          )}

          {error && (
            <p id={errorId} className="app-error" role="alert">
              {error}
            </p>
          )}

          {weightWarning && (
            <div role="alert" className="rounded-md border border-warning-400/30 bg-warning-400/10 p-3 text-sm font-medium text-warning-400">
              {weightWarning}
            </div>
          )}

          <div className="flex justify-end gap-2.5 border-t border-[var(--border)] pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="app-button-ghost disabled:opacity-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="app-button-primary disabled:opacity-50">
              {submitting ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
              {submitting ? 'Agregando...' : weightConfirmed ? 'Confirmar y agregar al rodeo' : 'Agregar al rodeo'}
            </button>
          </div>
        </form>

        {summaryPaddockId != null && (
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <h4 className="font-display text-sm text-[var(--text)]">
              Resumen del Rodeo{summaryPaddockName ? ` — ${summaryPaddockName}` : ''}
            </h4>
            {herdTotal === 0 ? (
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                Este potrero todavía no tiene ganado registrado.
              </p>
            ) : (
              <>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    {herdTotal} {herdTotal === 1 ? 'cabeza' : 'cabezas'} actualmente en este potrero.
                  </p>
                  <button
                    type="button"
                    onClick={handleCalculateDmi}
                    disabled={dmiLoading}
                    className="app-button-secondary shrink-0 px-3 text-xs disabled:opacity-50">
                    {dmiLoading ? (
                      <LoaderCircle size={12} className="animate-spin" />
                    ) : (
                      <Calculator size={12} />
                    )}
                    Calcular consumo DMI
                  </button>
                </div>

                {dmiError && (
                  <p role="alert" className="app-error mt-2 text-sm font-semibold">
                    {dmiError}
                  </p>
                )}

                {dmiResult && (
                  <div role="status" aria-live="polite" className="app-panel-muted mt-2 px-3.5 py-2.5 text-sm text-[var(--text-soft)]">
                    Consumo total del potrero:{' '}
                    <strong className="text-[var(--text)]">
                      {Number(dmiResult.kg_materia_seca_dia).toFixed(2)} kg MS/día
                    </strong>
                    {dmiResult.advertencias?.length > 0 && (
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-sm text-warning-400">
                        {dmiResult.advertencias.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-forest-900 text-xs uppercase tracking-wider text-[var(--text-muted)] shadow-sm">
                      <tr>
                        <th className="px-3 py-2 font-bold">Caravana</th>
                        <th className="px-3 py-2 font-bold">Categoría</th>
                        <th className="px-3 py-2 font-bold">Sexo</th>
                        <th className="px-3 py-2 text-right font-bold">Peso</th>
                        <th className="px-3 py-2 text-right font-bold">CC</th>
                        <th className="px-3 py-2 font-bold">Estado</th>
                        <th className="px-3 py-2 text-right font-bold">DMI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand-100/[.05] text-[var(--text-soft)]">
                      {herdRows.map((animal) => {
                        const prediction = dmiByAnimalId.get(String(animal.id));
                        return (
                          <tr key={animal.id} className="transition-colors hover:bg-sand-100/[.02]">
                            <td className="px-3 py-2 font-semibold text-[var(--text)]">{animal.caravana}</td>
                            <td className="px-3 py-2">{animal.category}</td>
                            <td className="px-3 py-2">{animal.sex === 'M' ? 'Macho' : 'Hembra'}</td>
                            <td className="px-3 py-2 text-right">{animal.weight}</td>
                            <td className="px-3 py-2 text-right">{animal.cc}</td>
                            <td className="px-3 py-2">
                              {formatPhysiologicalStatus(animal.status)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {prediction ? `${prediction.dmi_kg_dia.toFixed(2)} kg/día` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-[var(--text-soft)]">
                  <span>Machos: {herdMales}</span>
                  <span>Hembras: {herdFemales}</span>
                </div>
              </>
            )}
          </div>
        )}
    </>
  );

  if (variant === 'inline') {
    return <div className="text-[var(--text-soft)]">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="app-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto p-4 text-[var(--text-soft)] shadow-[var(--shadow-raised)] sm:p-6">
        {content}
      </div>
    </div>
  );
}
