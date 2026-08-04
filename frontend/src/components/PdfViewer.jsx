import React from 'react';
import { X, Download, FileText } from 'lucide-react';

/**
 * PDF Viewer component to render blobs natively within an iframe on desktop,
 * and provide a premium, secure fallback UI for mobile browsers.
 */
export default function PdfViewer({ url, filename, onClose, onDownload }) {
  // Mobile device detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="flex flex-col w-full max-w-4xl h-[85vh] md:h-[90vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-scale-up">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Document Vault Preview</span>
            <h3 className="text-sm font-semibold text-slate-100 truncate max-w-xs sm:max-w-md mt-0.5">{filename}</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                title="Download PDF"
              >
                <Download size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Close Preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* PDF Container */}
        <div className="flex-1 bg-slate-950 p-2 md:p-4 flex flex-col justify-center">
          {url ? (
            isMobile ? (
              /* High-end Mobile Fallback UI */
              <div className="flex flex-col items-center justify-center text-center px-4 py-8 space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
                  <FileText size={28} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-slate-200 font-bold text-sm">Visualización en Dispositivos Móviles</h4>
                  <p className="text-slate-400 text-xs max-w-xs leading-relaxed mx-auto">
                    Por motivos de seguridad y compatibilidad, los navegadores móviles impiden incrustar PDFs directos dentro de las apps. Puedes abrir este documento cifrado de forma segura en pantalla completa.
                  </p>
                </div>
                <div className="flex flex-col w-full max-w-xs gap-3">
                  <button
                    onClick={() => window.open(url, '_blank')}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-md shadow-emerald-500/5 hover:shadow-emerald-500/15"
                  >
                    Ver en Pantalla Completa
                  </button>
                  {onDownload && (
                    <button
                      onClick={onDownload}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs tracking-wider uppercase transition-all"
                    >
                      Descargar en tu Celular
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Desktop Embedded iframe */
              <iframe
                src={`${url}#toolbar=1`}
                className="w-full h-full rounded-lg border border-slate-850"
                title={filename}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Generating secure document stream...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
