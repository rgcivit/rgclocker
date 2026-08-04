import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Eye, EyeOff, Lock, User } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!username || !password) {
      setError('Por favor, completa todos los campos requeridos.');
      setIsSubmitting(false);
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor, vuelve a escribir la contraseña.');
      setIsSubmitting(false);
      return;
    }

    let result;
    if (isRegistering) {
      // Auto-generate email based on username to fulfill backend database constraints
      const email = `${username}@rgclocker.local`;
      result = await register(username, email, password);
    } else {
      result = await login(username, password);
    }

    if (!result.success) {
      setError(result.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-radial from-[#0e1115] via-[#07090b] to-[#040506]">
      <div className="w-full max-w-md">
        {/* Brand / Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-0.5 shadow-lg shadow-emerald-500/10 mb-4">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Lock className="text-emerald-400 w-7 h-7" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">rgClocker</h1>
          <p className="text-sm text-slate-400 mt-1.5">Bóveda Cifrada de Documentación Personal</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-xl">
          <h2 className="text-lg font-medium text-slate-200 mb-6">
            {isRegistering ? 'Crea tu cuenta de bóveda' : 'Inicia sesión en tu bóveda'}
          </h2>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm mb-5">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4.5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Nombre de usuario
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. locker"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-lg placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {isRegistering ? 'Contraseña nueva' : 'Contraseña de acceso'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-lg placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Volver a poner la contraseña
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-lg placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium rounded-lg shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:translate-y-px transition-all text-sm disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isSubmitting
                ? 'Conectando con la Bóveda...'
                : isRegistering
                ? 'Crear Cuenta'
                : 'Desbloquear Acceso'}
            </button>
          </form>

          {/* Toggle register / login link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors underline underline-offset-4"
            >
              {isRegistering
                ? '¿Ya tienes una cuenta? Iniciar Sesión'
                : '¿No tienes cuenta? Registra tu clave'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
