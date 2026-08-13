import { useEffect, useState } from 'react';
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

  const summaryPaddockId =
    lockedPaddockId ?? (selectedPaddockId ? Number(selectedPaddockId) : null);

  useEffect(() => {
    if (!isOpen) return;
    setCategory('VACA');
    setQuantity('1');
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
  }, [isOpen]);

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
  const herd = summaryPaddockId != null ? cattle.filter((a) => a.paddockId === summaryPaddockId) : [];
  const herdRows = [...herd].sort((a, b) =>
    String(a.caravana).localeCompare(String(b.caravana), 'es', { numeric: true })
  );

  const herdTotal = herd.length;
  const herdMales = herd.filter((a) => a.sex === 'M').length;
  const herdFemales = herd.filter((a) => a.sex === 'F').length;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setWeightWarning('');

    const qty = parseInt(quantity, 10);
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
      buildCattleCreatePayload({
        caravana,
        sex,
        category,
        weight: weightNumber,
        cc: isVaca ? cc : '',
        status: isVaca ? status : 'DESCONOCIDO',
      })
    );

    const paddockId = lockedPaddockLabel ? null : selectedPaddockId ? Number(selectedPaddockId) : null;

    onAdd({ paddockId, animals });
    onClose();
  }

  const content = (
    <>
      <div className="flex items-center justify-between border-b border-white/[.08] pb-4">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="font-display text-lg text-white">Agregar Ganado</h3>
            <p className="text-[11px] text-stone-500">
              Ingresá los datos del rodeo a incorporar.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-stone-500 hover:bg-white/[.05] hover:text-white">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-[12px]">
          {lockedPaddockLabel ? (
            <div className="rounded-lg border border-white/[.06] bg-white/[.03] px-3.5 py-2.5 text-[11px] text-stone-400">
              Se asignará al potrero <strong className="text-white">{lockedPaddockLabel}</strong> al
              guardar.
            </div>
          ) : (
            <div>
              <label className="block font-bold text-stone-400">Potrero de Destino (opcional)</label>
              <select
                value={selectedPaddockId}
                onChange={(e) => setSelectedPaddockId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-white outline-none focus:border-stone-500">
                <option value="">Sin potrero</option>
                {paddocks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-stone-400">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-white outline-none focus:border-stone-500">
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-400">Cantidad (cabezas)</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-white outline-none focus:border-stone-500"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-400">Peso Vivo (kg)</label>
              <input
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
                className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-white outline-none focus:border-stone-500"
              />
            </div>
          </div>

          {isVaca ? (
            <>
              <div>
                <label className="block font-bold text-stone-400">
                  Condición Corporal{' '}
                  <span className="text-[10px] text-stone-500 font-normal">(Escala 1.0 a 5.0)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  placeholder="Ej: 3.5"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-white outline-none focus:border-stone-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-400">Estado Fisiológico</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-white outline-none focus:border-stone-500">
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-white/[.02] border border-white/[.05] p-3 text-[11px] text-stone-500">
              * Para esta categoría solo se requiere Peso Vivo. La Condición Corporal y Estado
              Fisiológico no aplican.
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-500/10 p-2.5 text-[11px] font-semibold text-red-400">
              {error}
            </p>
          )}

          {weightWarning && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] font-medium text-amber-300">
              ⚠️ {weightWarning}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[.08]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 font-semibold text-stone-400 hover:bg-white/[.05] hover:text-white">
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 font-bold text-black hover:bg-emerald-400">
              <Plus size={14} /> {weightConfirmed ? 'Confirmar y Agregar al Rodeo' : 'Agregar al Rodeo'}
            </button>
          </div>
        </form>

        {summaryPaddockId != null && (
          <div className="mt-5 border-t border-white/[.08] pt-4">
            <h4 className="font-display text-sm text-white">
              Resumen del Rodeo{summaryPaddockName ? ` — ${summaryPaddockName}` : ''}
            </h4>
            {herdTotal === 0 ? (
              <p className="mt-1.5 text-[11px] text-stone-500">
                Este potrero todavía no tiene ganado registrado.
              </p>
            ) : (
              <>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-stone-500">
                    {herdTotal} {herdTotal === 1 ? 'cabeza' : 'cabezas'} actualmente en este potrero.
                  </p>
                  <button
                    type="button"
                    onClick={handleCalculateDmi}
                    disabled={dmiLoading}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-1.5 text-[11px] font-bold text-stone-300 hover:bg-white/[.06] disabled:opacity-50">
                    {dmiLoading ? (
                      <LoaderCircle size={12} className="animate-spin" />
                    ) : (
                      <Calculator size={12} />
                    )}
                    Calcular consumo DMI
                  </button>
                </div>

                {dmiError && (
                  <p className="mt-2 rounded-md bg-red-500/10 p-2.5 text-[11px] font-semibold text-red-400">
                    {dmiError}
                  </p>
                )}

                {dmiResult && (
                  <div className="mt-2 rounded-lg border border-white/[.06] bg-white/[.03] px-3.5 py-2.5 text-[11px] text-stone-300">
                    Consumo total del potrero:{' '}
                    <strong className="text-white">
                      {Number(dmiResult.kg_materia_seca_dia).toFixed(2)} kg MS/día
                    </strong>
                    {dmiResult.advertencias?.length > 0 && (
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[10px] text-amber-400">
                        {dmiResult.advertencias.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-white/[.06]">
                  <table className="w-full min-w-[500px] text-left text-[11px]">
                    <thead className="sticky top-0 z-10 border-b border-white/[.06] bg-[#161619] text-[10px] uppercase tracking-wider text-stone-500 shadow-sm">
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
                    <tbody className="divide-y divide-white/[.05] text-stone-300">
                      {herdRows.map((animal) => {
                        const prediction = dmiByAnimalId.get(String(animal.id));
                        return (
                          <tr key={animal.id} className="hover:bg-white/[.02] transition-colors">
                            <td className="px-3 py-2 font-semibold text-white">{animal.caravana}</td>
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
                <div className="mt-2 flex gap-4 text-[11px] text-stone-400">
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
    return <div className="text-stone-300">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-[#161619] p-6 text-stone-300 shadow-2xl">
        {content}
      </div>
    </div>
  );
}
