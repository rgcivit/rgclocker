import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLockers } from '../context/LockerContext';
import { useAutoLock } from '../hooks/useAutoLock';
import api from '../services/api';
import PdfViewer from '../components/PdfViewer';
import { 
  ArrowLeft, Lock, FileText, Upload, Trash2, Eye, Download, 
  Loader2, AlertTriangle, CloudUpload, Pencil 
} from 'lucide-react';
import { playLockSound } from '../utils/sounds';
import { Capacitor } from '@capacitor/core';

export default function LockerView() {
  const { lockerId } = useParams();
  const navigate = useNavigate();
  const { lockers, isLockerUnlocked, lockLocker, deleteLocker, renameLocker } = useLockers();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // File upload states
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // PDF Preview states
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewFilename, setPreviewFilename] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Rename states
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Find current locker details
  const currentLocker = lockers.find(l => l.id === lockerId);

  // Level 2 Security Auto-lock: Automatically locks this locker after 5 minutes of inactivity.
  // When locked, alert the user and redirect back to the dashboard.
  useAutoLock(lockerId, () => {
    playLockSound(false); // Play solid latch thud sound on auto-locking
    alert(`[Seguridad] El archivador "${currentLocker?.name || 'Locker'}" ha sido bloqueado automáticamente por inactividad de 5 minutos.`);
    navigate('/dashboard');
  });

  // Redirect if locker is locked
  useEffect(() => {
    if (!isLockerUnlocked(lockerId)) {
      navigate('/dashboard');
    } else {
      fetchDocuments();
    }
  }, [lockerId, isLockerUnlocked]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/documents/${lockerId}`);
      setDocuments(response.data.documents);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError(err.response?.data?.message || 'No se pudieron cargar los documentos.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLock = () => {
    lockLocker(lockerId);
    playLockSound(false); // Play solid latch thud sound on locking
    navigate('/dashboard');
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadClick = async (e) => {
    // If running natively under Capacitor, intercept the click to avoid buggy WebView file inputs
    if (Capacitor.isNativePlatform()) {
      e.preventDefault();
      e.stopPropagation();
      if (uploading) return;

      try {
        // Dynamically import the Capacitor file picker to prevent bundler issues on web
        const { FilePicker } = await import('@capawesome/capacitor-file-picker');
        const result = await FilePicker.pickFiles({
          types: ['application/pdf'],
          multiple: false,
          readData: true
        });

        if (result.files && result.files.length > 0) {
          const pickedFile = result.files[0];
          if (!pickedFile.data) {
            throw new Error('No se pudieron leer los datos del archivo.');
          }

          // Convert the base64 string back into binary byte arrays
          const byteCharacters = atob(pickedFile.data);
          const byteArrays = [];
          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          
          // Construct a native File object compatible with our existing upload logic
          const mimeType = pickedFile.mimeType || 'application/pdf';
          const blob = new Blob(byteArrays, { type: mimeType });
          const file = new File([blob], pickedFile.name || 'documento.pdf', { type: mimeType });

          uploadFile(file);
        }
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes('cancel')) {
          console.log('[Native File Picker] Selección cancelada por el usuario.');
        } else {
          console.error('[Native File Picker] Error picking file:', err);
          setUploadError('Error al abrir o leer el archivo seleccionado.');
        }
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    if (file.type !== 'application/pdf') {
      setUploadError('Únicamente se permiten archivos PDF.');
      return;
    }

    setUploadError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/documents/${lockerId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      fetchDocuments(); // Refresh list
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.response?.data?.message || 'Error al subir y cifrar el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId, filename) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente de tu bóveda y de Google Drive el archivo "${filename}"?`)) {
      try {
        await api.delete(`/documents/${lockerId}/delete/${docId}`);
        setDocuments(prev => prev.filter(d => d.id !== docId));
      } catch (err) {
        console.error('Delete document failed:', err);
        alert('Error al intentar eliminar el documento.');
      }
    }
  };

  const handleRenameLocker = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    if (!editName) {
      setModalError('Por favor introduce un nombre válido.');
      setIsSubmitting(false);
      return;
    }

    const res = await renameLocker(lockerId, editName, editCategory);
    if (res.success) {
      setShowRenameModal(false);
      playLockSound(true); // Play tactile click upon successful rename!
    } else {
      setModalError(res.message);
    }
    setIsSubmitting(false);
  };

  const handleDeleteLocker = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente este locker "${currentLocker?.name}" y TODOS sus archivos encriptados? Esta acción es irreversible.`)) {
      const res = await deleteLocker(lockerId);
      if (res.success) {
        playLockSound(false); // Play solid lock drop sound
        navigate('/dashboard');
      } else {
        alert(res.message);
      }
    }
  };

  // PREVIEW AND DOWNLOAD IMPLEMENTATION (AXIOS BLOB & OBJECT URL)
  const handleAction = async (docId, filename, isDownload) => {
    try {
      // 1. Fetch encrypted stream from backend, which decrypts on the fly and returns a PDF Blob
      const response = await api.get(`/documents/${lockerId}/download/${docId}${isDownload ? '?download=true' : ''}`, {
        responseType: 'blob' // Essential to handle binary streams in Axios
      });

      // 2. Generate a temporary local Object URL for the PDF blob
      const fileBlob = new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(fileBlob);

      if (isDownload) {
        // Trigger direct browser download
        const link = document.createElement('a');
        link.href = objectUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      } else {
        // Open PDF viewer inside React
        setPreviewUrl(objectUrl);
        setPreviewFilename(filename);
        setShowPreview(true);
      }
    } catch (err) {
      console.error('File operation failed:', err);
      alert('Error al procesar el archivo seguro. Comprueba tus permisos de bóveda.');
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl); // Revoke temporary URL to save memory
    }
    setPreviewUrl('');
    setPreviewFilename('');
    setShowPreview(false);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header toolbar */}
      <header className="bg-slate-900/40 border-b border-slate-900 backdrop-blur px-6 py-4.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-200">
                  {currentLocker?.name || 'Archivador'}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Abierto
                </span>

                {/* Rename/Edit Button */}
                <button
                  onClick={() => {
                    setEditName(currentLocker?.name || '');
                    setEditCategory(currentLocker?.category || 'Personal');
                    setModalError('');
                    setShowRenameModal(true);
                  }}
                  className="p-1.5 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-slate-500 transition-all duration-200 ml-1"
                  title="Editar Nombre del Locker"
                >
                  <Pencil size={13} />
                </button>

                {/* Delete Button */}
                <button
                  onClick={handleDeleteLocker}
                  className="p-1.5 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-slate-500 transition-all duration-200"
                  title="Eliminar Locker Permanentemente"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Categoría: {currentLocker?.category} • Auto-cierre activo (5m)</p>
            </div>
          </div>

          <button
            onClick={handleManualLock}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 rounded-lg text-xs font-semibold border border-rose-500/20 transition-all"
          >
            <Lock size={13} />
            <span>Cerrar Locker</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Upload & Stats (1 col) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CloudUpload size={16} className="text-emerald-400" />
              <span>Subir Documento PDF</span>
            </h3>

            {/* Interactive Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-500/[0.02]' 
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900/10'
              }`}
            >
              <input
                type="file"
                id="file-upload"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              <label 
                htmlFor="file-upload" 
                onClick={handleUploadClick}
                className="cursor-pointer flex flex-col items-center w-full h-full"
              >
                {uploading ? (
                  <div className="flex flex-col items-center py-4">
                    <Loader2 className="animate-spin text-emerald-400 mb-3" size={28} />
                    <span className="text-xs font-semibold text-slate-300">Cifrando archivo...</span>
                    <span className="text-[10px] text-slate-500 mt-1">Subiendo a Google Drive</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <Upload size={32} className="text-slate-500 mb-3 group-hover:text-emerald-400" />
                    <span className="text-xs font-medium text-slate-300">Arrastra un archivo PDF aquí</span>
                    <span className="text-[10px] text-slate-500 mt-1">o haz clic para explorar</span>
                    <span className="text-[9px] text-slate-600 mt-3 uppercase font-semibold">Max 20MB • PDF</span>
                  </div>
                )}
              </label>
            </div>

            {uploadError && (
              <div className="flex gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs mt-4">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Quick Security info */}
          <div className="bg-slate-900/10 border border-slate-900/50 p-5 rounded-xl text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Cifrado Militar AES-256-GCM</p>
            <p>Tus archivos se encriptan localmente en memoria antes de subirse. Nadie, incluyendo Google o proveedores de hosting, puede ver tus documentos personales sin la clave de encriptación maestra.</p>
            <p>La clave de sesión del archivador se destruye de forma automática tras 5 minutos de inactividad de tu parte.</p>
          </div>
        </div>

        {/* Right column: Document Listing (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl min-h-[400px] flex flex-col">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={16} className="text-emerald-400" />
              <span>Documentos Encriptados ({documents.length})</span>
            </h3>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="animate-spin text-emerald-400 mb-3" size={28} />
                <p className="text-xs">Descifrando índice de archivos...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-rose-400 py-16">
                <AlertTriangle size={32} className="mb-2" />
                <p className="text-xs">{error}</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 border border-dashed border-slate-900 rounded-xl bg-slate-950/20">
                <FileText size={38} className="text-slate-700 mb-2" />
                <h4 className="text-slate-400 font-medium text-sm">Este locker está vacío</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">Arrastra y suelta tu primer archivo PDF a la izquierda para encriptarlo y almacenarlo.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Nombre</th>
                      <th className="pb-3 hidden sm:table-cell">Tamaño</th>
                      <th className="pb-3 hidden md:table-cell">Subido</th>
                      <th className="pb-3 text-right pr-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/50">
                    {documents.map(doc => (
                      <tr key={doc.id} className="group hover:bg-slate-900/10 transition-colors">
                        {/* File Name */}
                        <td className="py-3.5 pl-2 max-w-xs md:max-w-md">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                              <FileText size={15} />
                            </div>
                            <div className="truncate">
                              <span className="text-xs font-medium text-slate-300 group-hover:text-emerald-400 transition-colors block truncate" title={doc.originalName}>
                                {doc.originalName}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate font-mono mt-0.5">
                                ID: {doc.id.substring(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* File Size */}
                        <td className="py-3.5 text-xs text-slate-400 hidden sm:table-cell">
                          {formatBytes(doc.size)}
                        </td>

                        {/* Upload Date */}
                        <td className="py-3.5 text-xs text-slate-400 hidden md:table-cell">
                          {formatDate(doc.createdAt)}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 text-right pr-2">
                          <div className="inline-flex items-center gap-1">
                            {/* Preview */}
                            <button
                              onClick={() => handleAction(doc.id, doc.originalName, false)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all"
                              title="Visualizar PDF"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Download */}
                            <button
                              onClick={() => handleAction(doc.id, doc.originalName, true)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all"
                              title="Descargar PDF"
                            >
                              <Download size={14} />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteDocument(doc.id, doc.originalName)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                              title="Eliminar Archivo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* PDF PREVIEW MODAL */}
      {showPreview && (
        <PdfViewer
          url={previewUrl}
          filename={previewFilename}
          onClose={closePreview}
          onDownload={() => {
            // Find current active document ID matching filename to trigger download
            const doc = documents.find(d => d.originalName === previewFilename);
            if (doc) {
              handleAction(doc.id, doc.originalName, true);
            }
          }}
        />
      )}

      {/* RENAME/EDIT LOCKER MODAL */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6.5">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-1">
              <Pencil className="text-emerald-400" size={18} />
              <span>Editar Archivador</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">Modifica los detalles del cofre seleccionado. Esta operación no altera tus archivos encriptados.</p>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRenameLocker} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nuevo Nombre</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="ej. Mis Impuestos Modificado"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nueva Categoría</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
                >
                  <option value="Salud">Salud</option>
                  <option value="Vehículos">Vehículos</option>
                  <option value="Legal">Legal</option>
                  <option value="Impuestos">Impuestos</option>
                  <option value="Personal">Personal</option>
                  <option value="Trabajo">Trabajo</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
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
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
