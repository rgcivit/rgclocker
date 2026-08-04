import React, { useState } from 'react';
import { useLockers } from '../context/LockerContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  FolderLock, FolderOpen, Plus, LogOut, Loader2, KeyRound, 
  Heart, Car, FileText, Landmark, User, Briefcase, HelpCircle, Trash2 
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Salud', icon: Heart, color: 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/10' },
  { name: 'Vehículos', icon: Car, color: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/10' },
  { name: 'Legal', icon: FileText, color: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/10' },
  { name: 'Impuestos', icon: Landmark, color: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/10' },
  { name: 'Personal', icon: User, color: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/10' },
  { name: 'Trabajo', icon: Briefcase, color: 'from-teal-500/20 to-teal-600/5 text-teal-400 border-teal-500/10' },
  { name: 'Otros', icon: HelpCircle, color: 'from-slate-500/20 to-slate-600/5 text-slate-400 border-slate-500/10' }
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { lockers, loading, createLocker, unlockLocker, isLockerUnlocked, deleteLocker } = useLockers();
  const navigate = useNavigate();

  // Active filters and modal states
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [activeLockerId, setActiveLockerId] = useState(null);
  
  // Forms inputs
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Personal');
  const [newPin, setNewPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  
  // Feedback states
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateLocker = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    if (!newName || !newPin) {
      setModalError('Por favor completa todos los campos.');
      setIsSubmitting(false);
      return;
    }

    if (!/^\d{4,6}$/.test(newPin)) {
      setModalError('El PIN debe ser numérico de 4 a 6 dígitos.');
      setIsSubmitting(false);
      return;
    }

    const res = await createLocker(newName, newCategory, newPin);
    if (res.success) {
      setNewName('');
      setNewPin('');
      setShowCreateModal(false);
    } else {
      setModalError(res.message);
    }
    setIsSubmitting(false);
  };

  const handleUnlockLocker = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    if (!pinInput) {
      setModalError('PIN requerido.');
      setIsSubmitting(false);
      return;
    }

    const res = await unlockLocker(activeLockerId, pinInput);
    if (res.success) {
      setPinInput('');
      setShowUnlockModal(false);
      navigate(`/locker/${activeLockerId}`);
    } else {
      setModalError(res.message);
    }
    setIsSubmitting(false);
  };

  const handleDeleteLocker = async (lockerId, name, e) => {
    e.stopPropagation(); // Avoid triggering open/unlock click
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el locker "${name}" y TODOS sus archivos encriptados? Esta acción es irreversible.`)) {
      const res = await deleteLocker(lockerId);
      if (!res.success) {
        alert(res.message);
      }
    }
  };

  const onLockerClick = (locker) => {
    if (isLockerUnlocked(locker.id)) {
      navigate(`/locker/${locker.id}`);
    } else {
      setActiveLockerId(locker.id);
      setModalError('');
      setPinInput('');
      setShowUnlockModal(true);
    }
  };

  const getCategoryMeta = (catName) => {
    return CATEGORIES.find(c => c.name.toLowerCase() === catName.toLowerCase()) || CATEGORIES[6];
  };

  const filteredLockers = selectedCategory === 'Todas'
    ? lockers
    : lockers.filter(l => l.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar Header */}
      <header className="bg-slate-900/40 border-b border-slate-900 backdrop-blur px-6 py-4.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FolderLock className="text-emerald-400 w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">rgClocker</h1>
              <p className="text-xs text-slate-400">Bóveda Cifrada • {user?.username}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-sm border border-slate-800 hover:border-slate-700 hover:text-white transition-all"
          >
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        
        {/* Banner with Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-200">Mis Archivadores (Lockers)</h2>
            <p className="text-sm text-slate-400 mt-1">Crea archivadores independientes protegidos con claves PIN de doble factor.</p>
          </div>
          <button
            onClick={() => {
              setModalError('');
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium rounded-lg text-sm shadow-md shadow-emerald-500/5 hover:shadow-emerald-500/15 transition-all"
          >
            <Plus size={16} />
            <span>Nuevo Locker</span>
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-slate-900 pb-5">
          <button
            onClick={() => setSelectedCategory('Todas')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selectedCategory === 'Todas'
                ? 'bg-slate-800 border-slate-700 text-slate-100'
                : 'bg-transparent border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800'
            }`}
          >
            Todas ({lockers.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = lockers.filter(l => l.category.toLowerCase() === cat.name.toLowerCase()).length;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selectedCategory === cat.name
                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                    : 'bg-transparent border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Locker Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="animate-spin text-emerald-400 mb-3" size={32} />
            <p className="text-sm">Abriendo registros de bóveda...</p>
          </div>
        ) : filteredLockers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-900 rounded-2xl bg-slate-950/40 px-6">
            <FolderLock size={44} className="mx-auto text-slate-700 mb-3" />
            <h3 className="text-slate-300 font-medium text-base">No hay lockers en esta categoría</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Comienza creando un archivador personal seguro con un PIN dedicado para guardar tus documentos en la nube.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredLockers.map(locker => {
              const unlocked = isLockerUnlocked(locker.id);
              const meta = getCategoryMeta(locker.category);
              const CatIcon = meta.icon;

              return (
                <div
                  key={locker.id}
                  onClick={() => onLockerClick(locker)}
                  className={`group relative bg-slate-900/20 border rounded-2xl p-6 flex flex-col justify-between cursor-pointer hover:bg-slate-900/45 hover:border-slate-800 active:scale-[0.99] transition-all duration-300 ${
                    unlocked ? 'border-emerald-500/20 shadow-lg shadow-emerald-500/[0.01]' : 'border-slate-900'
                  }`}
                >
                  {/* Top Header inside card */}
                  <div className="flex items-start justify-between mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold tracking-wider border uppercase ${meta.color}`}>
                      <CatIcon size={12} />
                      <span>{locker.category}</span>
                    </span>

                    {/* Locker Status Icon */}
                    <div className="flex items-center gap-1">
                      {unlocked ? (
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400" title="Desbloqueado (Activo)">
                          <FolderOpen size={14} />
                        </span>
                      ) : (
                        <span className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-850 text-slate-500" title="Bloqueado">
                          <FolderLock size={14} />
                        </span>
                      )}
                      
                      {unlocked && (
                        <button
                          onClick={(e) => handleDeleteLocker(locker.id, locker.name, e)}
                          className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-850 text-slate-500 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all"
                          title="Eliminar Locker"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Name and lock state banner */}
                  <div className="mt-2">
                    <h3 className="text-base font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">
                      {locker.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {unlocked 
                        ? 'Acceso concedido • Haz clic para entrar' 
                        : 'Archivador encriptado • Requiere PIN'
                      }
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CREATE LOCKER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6.5">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-1">
              <FolderLock className="text-emerald-400" size={20} />
              <span>Crear Nuevo Archivador</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">El contenido se cifrará de manera única con su clave PIN de locker.</p>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateLocker} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Archivador</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ej. Mis Impuestos 2026"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Categoría</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Clave PIN (Nivel 2 de Seguridad)</label>
                <input
                  type="password"
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="4 a 6 dígitos numéricos"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Guardar Locker</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNLOCK LOCKER MODAL (PIN ACCESS) */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6.5">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4">
              <KeyRound size={22} />
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              Desbloquear Archivador
            </h3>
            <p className="text-xs text-slate-400 mb-5">Introduce el código PIN de seguridad de este locker para descifrar su acceso (expira tras 15 minutos).</p>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleUnlockLocker} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  autoFocus
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Introduce PIN numérico"
                  className="w-full text-center tracking-widest text-lg px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-700 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(false)}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Abrir Locker</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
