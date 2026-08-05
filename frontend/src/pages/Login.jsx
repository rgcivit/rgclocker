import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Eye, EyeOff, ShieldAlert, KeyRound, ArrowLeft, Mail } from 'lucide-react';

export default function Login() {
  const { login, register, activateAccount } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Activation flow states
  const [showActivation, setShowActivation] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [activeUsername, setActiveUsername] = useState('');

  // Feedback states
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (!username || !password) {
        setError('Por favor, completa todos los campos requeridos.');
        setIsSubmitting(false);
        return;
      }

      if (isRegistering && !email) {
        setError('Por favor, ingresa tu correo electrónico.');
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
        result = await register(username, email, password);
      } else {
        result = await login(username, password);
      }

      // Capture activation requirement from backend (Level 3 Gatekeeper)
      if (result.requireActivation) {
        setActiveUsername(result.username);
        setSuccessMsg(result.message);
        setShowActivation(true);
        setIsSubmitting(false);
        return;
      }

      if (!result.success) {
        setError(result.message);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setError('No se pudo conectar con el servidor de la Bóveda. Inténtalo de nuevo.');
      setIsSubmitting(false);
    }
  };

  const handleActivateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    if (!activationCode) {
      setError('Por favor, introduce tu código de activación de 6 dígitos.');
      setIsSubmitting(false);
      return;
    }

    const result = await activateAccount(activeUsername, activationCode);
    if (result.success) {
      // Account activated and JWT set successfully. Router will auto-direct to dashboard.
    } else {
      setError(result.message);
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    setShowActivation(false);
    setIsRegistering(false);
    setActivationCode('');
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-radial from-[#0e1115] via-[#07090b] to-[#040506]">
      <div className="w-full max-w-md animate-scale-up">
        {/* Brand / Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-0.5 shadow-lg shadow-emerald-500/10 mb-4">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Lock className="text-emerald-400 w-7 h-7 animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-mono uppercase">rgClocker</h1>
          <p className="text-xs text-emerald-500/80 font-semibold tracking-widest mt-1.5 uppercase">Bóveda Encriptada Personal</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 p-8 rounded-2xl shadow-2xl">
          {showActivation ? (
            /* SECURE ACTIVATION SCREEN */
            <div>
              <button
                onClick={handleBackToLogin}
                className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6"
              >
                <ArrowLeft size={14} />
                <span>Volver al Login</span>
              </button>

              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2 mb-2 font-mono uppercase tracking-wide">
                <KeyRound className="text-emerald-400" size={18} />
                <span>Activa tu Bóveda</span>
              </h2>
              
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                El administrador ha recibido una notificación para autorizar tu cuenta. Una vez que te proporcione el código de activación de 6 dígitos, introdúcelo debajo.
              </p>

              {successMsg && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs mb-5">
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs mb-5">
                  <ShieldAlert size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleActivateSubmit} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                    Código de Activación (6 dígitos)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center tracking-[8px] text-xl font-bold font-mono px-3.5 py-3 bg-slate-950/80 border border-slate-800 text-emerald-400 rounded-xl placeholder-slate-800 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/5 transition-all text-xs tracking-wider uppercase disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? 'Verificando Código...' : 'Activar Cuenta'}
                </button>
              </form>
            </div>
          ) : (
            /* STANDARD REGISTER / LOGIN SCREEN */
            <div>
              <h2 className="text-lg font-bold text-slate-200 mb-5 font-mono uppercase tracking-wide">
                {isRegistering ? 'Registra tu acceso' : 'Desbloquea tu acceso'}
              </h2>

              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs mb-5">
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-lg placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm animate-fade-in"
                    />
                  </div>
                </div>

                {isRegistering && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <Mail size={18} />
                      </span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ej. correo@dominio.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 text-slate-200 rounded-lg placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm animate-fade-in"
                      />
                    </div>
                  </div>
                )}

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
                      Confirmar Contraseña
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
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/15 transition-all text-xs tracking-wider uppercase disabled:opacity-50 disabled:pointer-events-none mt-2"
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
                    setSuccessMsg('');
                    setPassword('');
                    setConfirmPassword('');
                    setEmail('');
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors underline underline-offset-4 font-semibold"
                >
                  {isRegistering
                    ? '¿Ya tienes una cuenta? Iniciar Sesión'
                    : '¿No tienes cuenta? Registra tu clave'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}