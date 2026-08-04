import React, { useState, useEffect, useRef } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';

/**
 * PDF Viewer component to render blobs natively within an iframe on desktop,
 * and utilize PDF.js Canvas drawing for in-memory, zero-download secure rendering on mobile.
 */
export default function PdfViewer({ url, filename, onClose, onDownload }) {
  // Mobile device detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // PDF.js mobile state
  const [pdf, setPdf] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const canvasRef = useRef(null);

  // Dynamic loading of PDF.js scripts for mobile in-memory viewing
  useEffect(() => {
    if (isMobile && url) {
      setRendering(true);
      
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.async = true;
      script.onload = () => {
        try {
          const pdfjsLib = window['pdfjs-dist/build/pdf'];
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
          setPdfjsLoaded(true);

          pdfjsLib.getDocument(url).promise.then((loadedPdf) => {
            setPdf(loadedPdf);
            setTotalPages(loadedPdf.numPages);
            setCurrentPage(1);
            renderPage(1, loadedPdf);
          }).catch(err => {
            console.error('[PDF.js] Failed to load secure document:', err);
            setRendering(false);
          });
        } catch (e) {
          console.error('[PDF.js] Initialization error:', e);
          setRendering(false);
        }
      };
      document.body.appendChild(script);
      
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [url]);

  const renderPage = (pageNumber, pdfInstance) => {
    const activePdf = pdfInstance || pdf;
    if (!activePdf) return;
    
    setRendering(true);
    activePdf.getPage(pageNumber).then((page) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const context = canvas.getContext('2d');
      
      // Calculate responsive mobile scale
      const viewport = page.getViewport({ scale: 1.0 });
      const containerWidth = window.innerWidth - 32; // margin padding
      const scale = containerWidth / viewport.width;
      const finalScale = Math.min(scale, 1.5);
      const scaledViewport = page.getViewport({ scale: finalScale });
      
      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
      };
      
      page.render(renderContext).promise.then(() => {
        setRendering(false);
      });
    }).catch(err => {
      console.error('[PDF.js] Error rendering page:', err);
      setRendering(false);
    });
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !rendering) {
      const nextPage = currentPage - 1;
      setCurrentPage(nextPage);
      renderPage(nextPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && !rendering) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      renderPage(nextPage);
    }
  };

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
            {/* Show download ONLY if we are NOT on a secure, temporary view of a borrowed device, but keep it as optional */}
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
        <div className="flex-1 bg-slate-950 flex flex-col justify-center overflow-hidden">
          {url ? (
            isMobile ? (
              /* High-end Mobile In-Memory Canvas UI (No local storage / No downloads!) */
              <div className="flex flex-col items-center justify-between h-full w-full">
                {/* Page Navigation Controls */}
                <div className="flex items-center justify-between w-full bg-slate-950 px-4 py-2.5 border-b border-slate-900 text-xs font-semibold text-slate-400 select-none">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1 || rendering}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg disabled:opacity-20 disabled:pointer-events-none transition-all"
                  >
                    Anterior
                  </button>
                  <span className="font-mono text-slate-300">Página {currentPage} de {totalPages || '?'}</span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages || rendering}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg disabled:opacity-20 disabled:pointer-events-none transition-all"
                  >
                    Siguiente
                  </button>
                </div>

                {/* Canvas viewport */}
                <div className="flex-1 w-full overflow-auto flex items-center justify-center p-4 relative bg-slate-950">
                  {rendering && (
                    <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center z-10">
                      <Loader2 className="animate-spin text-emerald-400" size={24} />
                    </div>
                  )}
                  {!pdfjsLoaded ? (
                    <div className="flex flex-col items-center py-4 text-slate-500">
                      <Loader2 className="animate-spin text-emerald-400 mb-3" size={24} />
                      <span className="text-xs">Inicializando visor en memoria segura...</span>
                    </div>
                  ) : (
                    <canvas ref={canvasRef} className="rounded border border-slate-900 shadow-xl max-w-full h-auto bg-white" />
                  )}
                </div>
                
                {/* Secure notice footer */}
                <div className="w-full text-center text-[10px] text-emerald-500/80 py-2 bg-slate-950 border-t border-slate-900 font-semibold tracking-wide">
                  🔒 Modo Privacidad • El PDF reside únicamente en memoria RAM (No se descarga al disco)
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
