import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

import bgImage from '../../images/image.jpg';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(nombre.trim(), email.trim(), password);
        navigate('/login', { state: { registered: true } });
      } else {
        const { hasEstancia } = await login(email.trim(), password);
        navigate(hasEstancia ? '/resumen' : '/onboarding/estancia');
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-forest-950 text-sand-200 lg:grid lg:grid-cols-[1.05fr_.95fr] text-sm">
      <section className="relative hidden min-h-screen overflow-hidden bg-forest-900 p-12 text-sand-100 lg:flex lg:flex-col lg:justify-between" aria-label="TerraBovina">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/40 to-forest-900/20" />
        {isRegister ? <Logo size={150} className="relative" /> : <div aria-hidden="true" />}
        <div className="relative max-w-xl animate-rise">
          <h1 className="max-w-lg text-5xl font-extrabold leading-[1.06] tracking-[-.035em]">Cada límite cuenta una historia.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-sand-200">
            Dibujá, organizá y consultá tus potreros desde una única vista territorial.
          </p>
        </div>
        <p className="relative text-xs font-semibold uppercase tracking-[.16em] text-sand-300">Gestión ganadera con perspectiva territorial</p>
      </section>

      <section className="flex min-h-screen items-center justify-center border-l border-sand-100/10 bg-forest-950 px-5 py-10 sm:px-12" aria-labelledby="auth-title">
        <div className="w-full max-w-sm animate-rise">
          {isRegister && <Logo size={132} className="mb-10 lg:hidden" />}
          <h2 id="auth-title" className="text-3xl font-extrabold tracking-[-.025em] text-sand-100 sm:text-4xl">
            {isRegister ? 'Empezá a mapear.' : 'Ingresá a tu campo.'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-sand-500">
            {isRegister
              ? 'Completá tus datos para crear un espacio de trabajo.'
              : 'Usá tus credenciales para continuar.'}
          </p>

          {!isRegister && location.state?.registered && (
            <p role="status" className="mt-5 flex items-center gap-2 rounded-lg border border-brand-400/25 bg-brand-500/10 px-3.5 py-3 text-xs font-semibold text-brand-400">
              <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" /> Cuenta creada con éxito. Ingresá con tus
              credenciales.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {isRegister && (
              <Field
                icon={User}
                label="Nombre completo"
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'auth-error' : undefined}
              />
            )}
            <Field
              icon={Mail}
              label="Correo electrónico"
              type="email"
              name="email"
              autoComplete={isRegister ? 'email' : 'username'}
              placeholder="nombre@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'auth-error' : undefined}
            />
            <Field
              icon={LockKeyhole}
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'auth-error' : undefined}
              action={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  className="app-icon-button !min-h-8 !w-8 !border-0 !bg-transparent"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              }
            />

            {error && (
              <p id="auth-error" role="alert" className="app-error text-xs font-semibold">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-label={loading ? (isRegister ? 'Creando cuenta' : 'Ingresando') : undefined}
              className="app-button-primary group w-full disabled:opacity-60">
              {loading ? (
                <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <>
                  {isRegister ? 'Crear cuenta' : 'Ingresar'}
                  <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-xs text-sand-500">
            {isRegister ? '¿Ya tenés una cuenta?' : '¿Todavía no tenés una cuenta?'}{' '}
            <Link
              className="font-bold text-sand-100 underline-offset-4 hover:underline"
              to={isRegister ? '/login' : '/registro'}>
              {isRegister ? 'Ingresá' : 'Registrate'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({ icon: Icon, label, action, ...inputProps }) {
  const fieldId = `auth-${inputProps.name}`;
  return (
    <div>
      <label htmlFor={fieldId} className="app-label">{label}</label>
      <div className="relative">
        <Icon size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sand-500" />
        <input
          id={fieldId}
          required
          className={`app-field pl-10 ${action ? 'pr-12' : ''}`}
          {...inputProps}
        />
        {action && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-sand-500">{action}</span>}
      </div>
    </div>
  );
}
