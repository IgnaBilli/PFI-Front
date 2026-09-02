import { Beef, ChartNoAxesCombined, LogOut, Map, LandPlot, Menu, X } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
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
  const menuButtonRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const focusableSelector =
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
    const focusableItems = sidebarRef.current?.querySelectorAll(focusableSelector);
    focusableItems?.[0]?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !focusableItems?.length) return;
      const first = focusableItems[0];
      const last = focusableItems[focusableItems.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function closeMenu() {
    setOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <div className="flex h-dvh min-h-[560px] overflow-hidden bg-forest-900 text-sand-300 text-sm">
      <a
        href="#app-main"
        className="fixed left-3 top-3 z-[3000] -translate-y-20 rounded-lg bg-sand-100 px-4 py-2 font-bold text-forest-950 transition-transform focus:translate-y-0">
        Saltar al contenido
      </a>
      <aside
        ref={sidebarRef}
        id="main-navigation"
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-[2000] flex w-[min(18rem,86vw)] flex-col border-r border-sand-100/10 bg-forest-900 px-4 py-5 shadow-[12px_0_36px_rgba(0,0,0,.3)] transition-transform duration-200 md:relative md:visible md:w-24 md:translate-x-0 md:px-3 md:shadow-none xl:w-64 xl:px-5 ${open ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}>
        <div className="relative flex items-center justify-center">
          <Logo size={136} className="md:hidden xl:block" />
          <Logo variant="icon" size={42} className="hidden md:block xl:hidden" />
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={closeMenu}
            className="app-icon-button absolute right-0 top-0 md:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 h-px shrink-0 bg-sand-100/10" />

        <div className="app-panel-muted mt-5 shrink-0 px-4 py-3.5 md:hidden xl:block">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-sand-500">Establecimiento</p>
          <p className="mt-1 truncate text-sm font-bold text-sand-100">
            {estancia?.nombre || 'Mi estancia'}
          </p>
          <p className="mt-0.5 text-xs text-sand-500">Argentina</p>
        </div>

        <p className="mt-7 mb-3 shrink-0 px-1 text-xs font-bold uppercase tracking-[.14em] text-sand-500 md:text-center xl:text-left">
          Navegación
        </p>
        <nav className="space-y-2 overflow-y-auto" aria-label="Secciones de la estancia">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMenu}
              className={({ isActive }) =>
                 `group relative flex min-h-12 w-full items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-[13px] font-bold transition-colors md:justify-center md:px-2 xl:justify-start xl:px-3 ${
                   isActive
                     ? 'border-brand-500 bg-brand-600 text-sand-100'
                     : 'border-transparent text-sand-300 hover:border-sand-100/10 hover:bg-forest-800 hover:text-sand-100'
                 }`
               }>
              <Icon size={19} aria-hidden="true" className="shrink-0" />
              <span className="flex-1 text-left md:sr-only xl:not-sr-only">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto shrink-0 pt-6">
          <div className="h-px bg-sand-100/10" />
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="app-button-ghost mt-3 w-full md:px-0 xl:px-3">
            <LogOut size={17} aria-hidden="true" />
            <span className="md:sr-only xl:not-sr-only">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {open && (
        <button
          aria-label="Cerrar menú"
          onClick={closeMenu}
          className="fixed inset-0 z-[1999] bg-black/65 md:hidden"
        />
      )}
      <main
        id="app-main"
        tabIndex="-1"
        inert={open ? true : undefined}
        className="relative min-w-0 flex-1 overflow-auto bg-forest-900">
        <header className="fixed inset-x-0 top-0 z-[1500] flex h-14 items-center justify-between border-b border-sand-100/10 bg-forest-900/95 px-3 md:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Abrir menú"
            aria-controls="main-navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="app-icon-button">
            <Menu size={19} aria-hidden="true" />
          </button>
          <Logo variant="icon" size={34} />
          <span className="size-[42px]" aria-hidden="true" />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
