import { Beef, ChartNoAxesCombined, Leaf, LogOut, Map, Menu, X, LandPlot } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';

const navigation = [
  { to: '/resumen', label: 'Resumen', icon: ChartNoAxesCombined },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/potreros', label: 'Potreros', icon: LandPlot },
  { to: '/ganado', label: 'Ganado', icon: Beef },
];

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);

  return (
    <main className="flex h-dvh min-h-[560px] overflow-hidden bg-[#0b0b0c] text-stone-200 text-sm">
      <aside
        className={`fixed inset-y-0 left-0 z-[2000] flex w-52 flex-col border-r border-white/[.06] bg-[#0f0f11] px-3.5 py-5 transition-transform md:relative md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-[#222227] text-white">
              <Leaf size={15} strokeWidth={2.5} />
            </span>
            <div>
              <strong className="block text-[13px] tracking-wide text-white font-bold">
                TerraBovina
              </strong>
              <span className="block text-[8px] uppercase tracking-[.18em] text-stone-500 font-semibold">
                Gestión ganadera
              </span>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-stone-500 md:hidden">
            <X size={17} />
          </button>
        </div>

        <nav className="mt-8 space-y-1.5">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-stone-500">
            Establecimiento
          </p>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 rounded-lg px-3 py-3 text-[12px] font-semibold transition ${isActive ? 'bg-[#222227] text-white  border-white' : 'text-stone-400 hover:bg-white/[.04] hover:text-white'}`
              }>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-lg border border-white/[.06] bg-[#161619] p-3.5">
          <p className="truncate text-[12px] font-bold text-stone-200">Estancia Casualidad</p>
          <p className="mt-0.5 text-[10px] text-stone-500 font-medium">Argentina</p>
        </div>
        <NavLink
          to="/login"
          className="mt-2 flex items-center gap-3 rounded-lg px-3 py-3 text-[12px] font-semibold text-stone-500 hover:bg-white/[.04] hover:text-white">
          <LogOut size={16} /> Cerrar sesión
        </NavLink>
      </aside>

      {open && (
        <button
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[1999] bg-black/60 md:hidden"
        />
      )}
      <section className="relative min-w-0 flex-1 overflow-auto bg-[#0b0b0c]">
        <button
          onClick={() => setOpen(true)}
          className="fixed left-3 top-3 z-[1500] grid size-10 place-items-center rounded-lg border border-white/10 bg-[#161619] text-stone-300 shadow-xl md:hidden">
          <Menu size={18} />
        </button>
        <Outlet />
      </section>
    </main>
  );
}
