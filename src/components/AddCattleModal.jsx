import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { buildCattleCreatePayload, CATEGORY_OPTIONS } from '../services/mappers.js';

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
  lockedPaddockLabel = null,
}) {
  const [category, setCategory] = useState('VACA');
  const [sex, setSex] = useState('M');
  const [quantity, setQuantity] = useState('1');
  const [identifications, setIdentifications] = useState(['']);
  const [weight, setWeight] = useState('');
  const [cc, setCc] = useState('');
  const [status, setStatus] = useState('N');
  const [selectedPaddockId, setSelectedPaddockId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCategory('VACA');
    setSex('M');
    setQuantity('1');
    setIdentifications(['']);
    setWeight('');
    setCc('');
    setStatus('N');
    setSelectedPaddockId('');
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const isVaca = category === 'VACA';
  const existingSet = new Set(existingCaravanas.map((c) => String(c).trim().toLowerCase()));

  function handleQuantityChange(value) {
    setQuantity(value);
    const qty = Math.max(1, parseInt(value, 10) || 1);
    setIdentifications((current) => {
      const next = current.slice(0, qty);
      while (next.length < qty) next.push('');
      return next;
    });
  }

  function updateIdentification(index, value) {
    setIdentifications((current) => current.map((item, i) => (i === index ? value : item)));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      setError('Ingresá una cantidad válida (mínimo 1).');
      return;
    }

    const trimmedIds = identifications.map((id) => id.trim());
    if (trimmedIds.some((id) => !id)) {
      setError('Ingresá la caravana o número de identificación de cada animal.');
      return;
    }
    const lowerIds = trimmedIds.map((id) => id.toLowerCase());
    if (new Set(lowerIds).size !== lowerIds.length) {
      setError('Hay caravanas repetidas en la lista.');
      return;
    }
    if (lowerIds.some((id) => existingSet.has(id))) {
      setError('Una de las caravanas ya está registrada en el rodeo.');
      return;
    }

    const weightNumber = Number(weight);
    if (!weight.trim() || !Number.isFinite(weightNumber) || weightNumber <= 0) {
      setError('Ingresá un peso vivo válido en kg.');
      return;
    }

    if (isVaca) {
      const numCc = parseFloat(cc);
      if (cc === '' || isNaN(numCc) || numCc < 1 || numCc > 5) {
        setError('La condición corporal es obligatoria para la categoría Vaca (escala 1.0 a 5.0).');
        return;
      }
    }

    const animals = trimmedIds.map((caravana) =>
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

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-[#161619] p-6 text-stone-300 shadow-2xl">
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

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="block font-bold text-stone-400">Sexo</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-white outline-none focus:border-stone-500">
                <option value="M">Macho</option>
                <option value="F">Hembra</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-400">Cantidad (cabezas)</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
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
                onChange={(e) => setWeight(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-white outline-none focus:border-stone-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-400">
              {identifications.length > 1 ? 'Identificación de cada animal' : 'Caravana / N° de identificación'}
            </label>
            <div className="mt-1.5 space-y-1.5">
              {identifications.map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                  {identifications.length > 1 && (
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-stone-700 text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                  )}
                  <input
                    type="text"
                    placeholder="Ej: AR-1234"
                    value={value}
                    onChange={(e) => updateIdentification(index, e.target.value)}
                    className="w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-white outline-none focus:border-stone-500"
                  />
                </div>
              ))}
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
              <Plus size={14} /> Agregar al Rodeo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
