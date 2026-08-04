import React from 'react';
import { X, Download } from 'lucide-react';

/**
 * PDF Viewer component to render blobs natively within an iframe.
 */
export default function PdfViewer({ url, filename, onClose, onDownload }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="flex flex-col w-full max-w-6xl h-[90vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-emerald-500 uppercase tracking-widest">Document Vault Preview</span>
            <h3 className="text-base font-medium text-slate-100 truncate max-w-lg">{filename}</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                title="Download PDF"
              >
                <Download size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PDF Container */}
        <div className="flex-1 bg-slate-950 p-2 md:p-4">
          {url ? (
            <iframe
              src={`${url}#toolbar=1`}
              className="w-full h-full rounded-lg border border-slate-850"
              title={filename}
            />
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
