import React, { useState } from 'react';
import { X, Globe, RefreshCw, Smartphone, Tablet, Monitor } from 'lucide-react';

interface WebPreviewModalProps {
  htmlContent: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WebPreviewModal: React.FC<WebPreviewModalProps> = ({
  htmlContent,
  isOpen,
  onClose
}) => {
  const [key, setKey] = useState(0);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  if (!isOpen) return null;

  const getContainerWidth = () => {
    if (deviceMode === 'mobile') return 'max-w-sm';
    if (deviceMode === 'tablet') return 'max-w-2xl';
    return 'max-w-5xl';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`bg-[#0f172a] border border-slate-700 rounded-2xl w-full ${getContainerWidth()} h-[85vh] shadow-2xl overflow-hidden flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-[#0b0f19]">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-slate-100 text-sm">Isolated Web Sandbox Preview</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              iframe sandbox
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Device Toggles */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => setDeviceMode('mobile')}
                className={`p-1.5 rounded ${deviceMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Mobile View"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeviceMode('tablet')}
                className={`p-1.5 rounded ${deviceMode === 'tablet' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Tablet View"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeviceMode('desktop')}
                className={`p-1.5 rounded ${deviceMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setKey(prev => prev + 1)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              title="Refresh Preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sandboxed iframe */}
        <div className="flex-1 bg-white p-0 relative">
          <iframe
            key={key}
            title="CloudCode Web Preview"
            srcDoc={htmlContent}
            sandbox="allow-scripts"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
