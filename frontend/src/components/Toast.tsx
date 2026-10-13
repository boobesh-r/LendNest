import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" id="lendnest-toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={18} color="#10b981" />}
          {toast.type === 'error' && <AlertCircle size={18} color="#ef4444" />}
          {toast.type === 'info' && <Info size={18} color="#38bdf8" />}
          <div style={{ flex: 1 }}>{toast.text}</div>
          <button
            onClick={() => onDismiss(toast.id)}
            style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
