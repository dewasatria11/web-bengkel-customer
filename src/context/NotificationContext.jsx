import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, XCircle, Info, HelpCircle, X } from 'lucide-react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null); // { id, type: 'alert'|'confirm', title, message, typeClass: 'success'|'error'|'info'|'warning', onConfirm, onCancel, confirmText, cancelText }

  // 1. Toast function
  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  // 2. Alert function
  const showAlert = useCallback((title, message, typeClass = 'info') => {
    return new Promise((resolve) => {
      const id = Date.now();
      setModal({
        id,
        type: 'alert',
        title,
        message,
        typeClass,
        confirmText: 'OK',
        onConfirm: () => {
          setModal(null);
          resolve(true);
        }
      });
    });
  }, []);

  // 3. Confirm function
  const showConfirm = useCallback((title, message, options = {}) => {
    return new Promise((resolve) => {
      const id = Date.now();
      setModal({
        id,
        type: 'confirm',
        title,
        message,
        typeClass: options.typeClass || 'warning',
        confirmText: options.confirmText || 'Ya, Lanjutkan',
        cancelText: options.cancelText || 'Batal',
        onConfirm: () => {
          setModal(null);
          resolve(true);
        },
        onCancel: () => {
          setModal(null);
          resolve(false);
        }
      });
    });
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-rose-500 flex-shrink-0" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="h-6 w-6 text-blue-500 flex-shrink-0" />;
    }
  };

  const getModalColorSchema = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="h-12 w-12 text-emerald-500" />,
          bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30',
          btn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white',
          glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]'
        };
      case 'error':
        return {
          icon: <XCircle className="h-12 w-12 text-rose-500" />,
          bg: 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/30',
          btn: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white',
          glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-12 w-12 text-amber-500" />,
          bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30',
          btn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]'
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-12 w-12 text-blue-500" />,
          bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30',
          btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
          glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]'
        };
    }
  };

  return (
    <NotificationContext.Provider value={{ showToast, showAlert, showConfirm }}>
      {children}

      {/* TOASTS CONTAINER */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const colors = {
              success: 'bg-white border-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.1)] text-emerald-950',
              error: 'bg-white border-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.1)] text-rose-950',
              warning: 'bg-white border-amber-100 shadow-[0_10px_30px_rgba(245,158,11,0.1)] text-amber-950',
              info: 'bg-white border-blue-100 shadow-[0_10px_30px_rgba(59,130,246,0.1)] text-blue-950'
            }[toast.type] || 'bg-white border-slate-100 shadow-lg text-slate-900';

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.9, rotateX: -10 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                layout
                className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border bg-card/95 backdrop-blur-md ${colors}`}
                style={{ perspective: 1000 }}
              >
                <div className="flex items-center gap-3">
                  {getIcon(toast.type)}
                  <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* MODAL DIALOGS CONTAINER */}
      <AnimatePresence>
        {modal && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={modal.type === 'alert' ? modal.onConfirm : modal.onCancel}
              className="absolute inset-0 bg-black/60 backdrop-blur-[6px]"
            />

            {/* Modal Card */}
            {(() => {
              const theme = getModalColorSchema(modal.typeClass);
              return (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 350 } }}
                  exit={{ scale: 0.95, opacity: 0, y: 15 }}
                  className={`relative w-full max-w-md bg-background border rounded-2xl p-6 overflow-hidden flex flex-col items-center text-center ${theme.glow} border-muted`}
                >
                  {/* Decorative background blur shape */}
                  <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none" />
                  <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none" />

                  {/* Icon Circle */}
                  <div className="relative mb-5 flex items-center justify-center p-4 bg-muted/40 rounded-full border border-muted-foreground/10">
                    <div className="absolute inset-0 bg-radial-gradient opacity-10 rounded-full" />
                    {theme.icon}
                  </div>

                  {/* Title & Body */}
                  <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
                    {modal.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 whitespace-pre-wrap">
                    {modal.message}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-3 w-full justify-center">
                    {modal.type === 'confirm' && (
                      <button
                        onClick={modal.onCancel}
                        className="px-5 py-2.5 rounded-xl border border-input bg-background hover:bg-accent text-sm font-medium transition-all duration-200 active:scale-95 flex-1 max-w-[150px]"
                      >
                        {modal.cancelText}
                      </button>
                    )}
                    <button
                      onClick={modal.onConfirm}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 flex-1 max-w-[150px] shadow-sm ${theme.btn}`}
                    >
                      {modal.confirmText}
                    </button>
                  </div>
                </motion.div>
              );
            })()}
          </div>,
          document.body
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}