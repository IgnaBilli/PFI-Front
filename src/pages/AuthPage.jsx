import { ArrowRight, Eye, Leaf, LockKeyhole, Mail, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()

  function handleSubmit(event) {
    event.preventDefault()
    navigate('/mapa')
  }

  return (
    <main className="min-h-screen bg-[#0b0b0c] text-stone-200 lg:grid lg:grid-cols-[1.08fr_.92fr] text-sm">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#0f0f11] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'repeating-radial-gradient(circle at 20% 10%, transparent 0, transparent 34px, #fff 35px, transparent 36px)' }} />
        <div className="absolute -bottom-28 -right-24 h-[440px] w-[440px] rounded-full border border-white/15" />
        <div className="relative flex items-center gap-3 text-lg font-bold tracking-wide">
          <span className="grid size-8 place-items-center rounded-lg bg-[#222227] text-white"><Leaf size={16} /></span>
          TERRABOVINA
        </div>
        <div className="relative max-w-xl animate-rise">
          <p className="mb-5 text-xs font-bold uppercase tracking-[.28em] text-stone-400">El campo, mejor medido</p>
          <h1 className="font-display text-5xl leading-[1.05]">Cada límite cuenta una historia.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/50">Dibujá, organizá y consultá tus potreros desde una única vista territorial.</p>
        </div>
        <p className="relative text-sm text-white/40">Plataforma de gestión territorial</p>
      </section>

      <section className="flex min-h-screen items-center justify-center border-l border-white/[.05] bg-[#0b0b0c] px-6 py-10 sm:px-12">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-12 flex items-center gap-3 font-bold tracking-wide text-white lg:hidden">
            <span className="grid size-8 place-items-center rounded-lg bg-[#222227] text-white"><Leaf size={16} /></span>
            TERRABOVINA
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-stone-400">{isRegister ? 'Creá tu cuenta' : 'Bienvenido de nuevo'}</p>
          <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">{isRegister ? 'Empezá a mapear.' : 'Ingresá a tu campo.'}</h2>
          <p className="mt-3 text-[12px] leading-5 text-stone-600">{isRegister ? 'Completá tus datos para crear un espacio de trabajo.' : 'Usá tus credenciales para continuar.'}</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {isRegister && <Field icon={User} label="Nombre completo" type="text" placeholder="Juan Pérez" />}
            <Field icon={Mail} label="Correo electrónico" type="email" placeholder="nombre@correo.com" />
            <Field icon={LockKeyhole} label="Contraseña" type="password" placeholder="Mínimo 8 caracteres" action={<Eye size={18} />} />
            <button className="group flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-[12px] font-bold text-black transition hover:bg-stone-250 focus:outline-none">
              {isRegister ? 'Crear cuenta' : 'Ingresar'}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <p className="mt-7 text-center text-[12px] text-stone-600">
            {isRegister ? '¿Ya tenés una cuenta?' : '¿Todavía no tenés una cuenta?'}{' '}
            <Link className="font-bold text-white hover:underline" to={isRegister ? '/login' : '/registro'}>{isRegister ? 'Ingresá' : 'Registrate'}</Link>
          </p>
          <div className="mt-6 rounded-lg border border-white/[.06] bg-white/[.025] px-4 py-2.5 text-center text-[10px] text-stone-600">Acceso demostrativo: cualquier dato permite ingresar.</div>
        </div>
      </section>
    </main>
  )
}

function Field({ icon: Icon, label, action, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold text-stone-400">{label}</span>
      <span className="flex items-center gap-3 rounded-lg border border-white/[.08] bg-[#121925] px-3 transition focus-within:border-stone-500">
        <Icon size={15} className="shrink-0 text-stone-600" />
        <input required className="min-w-0 flex-1 bg-transparent py-3 text-[11px] text-white outline-none placeholder:text-stone-700" {...inputProps} />
        {action && <span className="text-stone-700">{action}</span>}
      </span>
    </label>
  )
}
