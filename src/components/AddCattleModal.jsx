import { useState } from 'react';
import { X, Plus, Beef } from 'lucide-react';
import { generateUniqueCaravana } from '../hooks/useCattle.js';

const CATEGORIES = ['Vaca', 'Vaquilla', 'Novillo', 'Toro', 'Ternero/Ternera'];

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
  defaultPaddock = '',
}) {
  const [category, setCategory] = useState('Vaca');
  const [quantity, setQuantity] = useState('1');
  const [weight, setWeight] = useState('');
  const [cc, setCc] = useState('');
  const [status, setStatus] = useState('N');
  const [selectedPaddock, setSelectedPaddock] = useState(
    defaultPaddock || (paddocks[0]?.name ?? '')
  );
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isVaca = category === 'Vaca';

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      setError('Ingresá una cantidad válida (mínimo 1).');
      return;
    }

    if (isVaca) {
      if (cc !== '') {
        const numCc = parseFloat(cc);
        if (isNaN(numCc) || numCc < 1 || numCc > 5) {
          setError('La condición corporal debe estar entre 1.0 y 5.0.');
          return;
        }
      }
    }

    const formattedWeight = weight.trim()
      ? weight.toLowerCase().includes('kg')
        ? weight.trim()
        : `${weight.trim()} kg`
      : '-';
    const formattedCc = isVaca && cc.trim() ? cc.trim() : '-';
    const formattedStatus = isVaca ? status : 'DESCONOCIDO';

    // Create array of animals
    const newAnimals = [];
    for (let i = 0; i < qty; i++) {
      newAnimals.push({
        id: generateUniqueCaravana([]), // generate initial format
        category,
        weight: formattedWeight,
        cc: formattedCc,
        status: formattedStatus,
        paddock: selectedPaddock || defaultPaddock || '-',
      });
    }

    onAdd(newAnimals);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#161619] p-6 text-stone-300 shadow-2xl">
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
          {paddocks.length > 0 && !defaultPaddock && (
            <div>
              <label className="block font-bold text-stone-400">Potrero de Destino</label>
              <select
                value={selectedPaddock}
                onChange={(e) => setSelectedPaddock(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-white outline-none focus:border-stone-500">
                {paddocks.map((p) => (
                  <option key={p.id} value={p.name}>
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
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

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
          </div>

          <div>
            <label className="block font-bold text-stone-400">Peso Vivo (kg)</label>
            <input
              type="text"
              placeholder="Ej: 380"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-white outline-none focus:border-stone-500"
            />
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
              * Para la categoría <strong className="text-stone-300">{category}</strong> solo se
              requiere Peso Vivo. La Condición Corporal y Estado Fisiológico no aplican.
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
