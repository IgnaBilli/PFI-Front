import { Beef, ChartNoAxesCombined, LogOut, Map, LandPlot, Menu, X } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

const navigation = [
  { to: '/resumen', label: 'Resumen', icon: ChartNoAxesCombined },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/potreros', label: 'Potreros', icon: LandPlot },
  { to: '/ganado', label: 'Ganado', icon: Beef },
];

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { estancia, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <main className="flex h-dvh min-h-[560px] overflow-hidden bg-[#121614] text-[#B8AC96] text-sm">
      <aside
        className={`fixed inset-y-0 left-0 z-[2000] flex w-72 flex-col border-r border-[#5E4636]/25 bg-[#121614] px-5 py-6 transition-transform md:relative md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative flex items-center justify-center">
          <Logo size={150} />
          <button
            onClick={() => setOpen(false)}
            className="absolute right-0 top-0 text-[#B8AC96] md:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 h-px shrink-0 bg-gradient-to-r from-transparent via-[#5E4636]/50 to-transparent" />

        <div className="mt-5 shrink-0 rounded-2xl border border-[#5E4636]/30 bg-gradient-to-b from-[#1B211E] to-[#171b18] px-4 py-3.5 shadow-[0_4px_14px_rgba(0,0,0,.25)]">
          <p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#B8AC96]">Establecimiento</p>
          <p className="mt-1 truncate text-[15px] font-bold text-[#DDD0BC]">
            {estancia?.nombre || 'Mi estancia'}
          </p>
          <p className="mt-0.5 text-[10px] text-[#B8AC96]">Argentina</p>
        </div>

        <p className="mt-7 mb-3 shrink-0 px-1 text-[10px] font-bold uppercase tracking-[.24em] text-[#B8AC96]">
          Navegación
        </p>
        <nav className="space-y-2.5 overflow-y-auto">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `group relative flex w-full items-center justify-center gap-3.5 overflow-hidden rounded-2xl border px-4 py-3.5 text-[13px] font-bold transition-colors duration-150 ${
                  isActive
                    ? 'border-[#245746] bg-[#245746] text-[#DDD0BC]'
                    : 'border-[#5E4636]/25 bg-[#1B211E] text-[#B8AC96] hover:border-[#5E4636]/40 hover:bg-[#5E4636]/20 hover:text-[#DDD0BC]'
                }`
              }>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-[#7A5A46]" />
                  )}
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl transition-colors ${
                      isActive
                        ? 'bg-[#DDD0BC]/15 text-[#DDD0BC]'
                        : 'bg-[#5E4636]/25 text-[#DDD0BC]/85 group-hover:bg-[#7A5A46]/40'
                    }`}>
                    <Icon size={20} />
                  </span>
                  <span className="flex-1 text-left">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto shrink-0 pt-6">
          <div className="h-px bg-gradient-to-r from-transparent via-[#5E4636]/40 to-transparent" />
          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[12px] font-semibold text-[#B8AC96] transition hover:bg-[#5E4636]/20 hover:text-[#DDD0BC]">
            <LogOut size={17} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {open && (
        <button
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[1999] bg-black/60 md:hidden"
        />
      )}
      <section className="relative min-w-0 flex-1 overflow-auto bg-[#121614]">
        <button
          onClick={() => setOpen(true)}
          className="fixed left-3 top-3 z-[1500] grid size-10 place-items-center rounded-lg border border-[#5E4636]/30 bg-[#1B211E] text-[#B8AC96] shadow-xl md:hidden">
          <Menu size={18} />
        </button>
        <Outlet />
      </section>
    </main>
  );
}
