/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ─── Badge ─────────────────────────────────────────────────────────────────────
export const Badge = React.memo(({ children, variant = 'default', className }) => {
  const variants = {
    default:  'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    en_cours: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30',
    jugee:    'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30',
    appelee:  'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30',
    classee:  'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/30',
    error:    'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30',
    success:  'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30',
    warning:  'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30',
  };

  return (
    <span className={cn(
      'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
      variants[variant] || variants.default,
      className
    )}>
      {children}
    </span>
  );
});
Badge.displayName = 'Badge';

// ─── Card ──────────────────────────────────────────────────────────────────────
export const Card = React.forwardRef(({ children, className, title, subtitle, icon: Icon, onClick }, ref) => {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        'glass-card p-8 rounded-[2rem] transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {(title || Icon) && (
        <div className="flex items-center justify-between mb-6">
          <div>
            {title && <h3 className="text-xl font-bold text-navy-900 dark:text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          </div>
          {Icon && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-navy-600">
              <Icon size={20} />
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
});
Card.displayName = 'Card';

// ─── StatCard ─────────────────────────────────────────────────────────────────
export const StatCard = React.memo(({ title, value, icon: Icon, color = 'blue', onClick }) => {
  const colors = {
    blue:   'bg-blue-500 shadow-blue-500/30',
    green:  'bg-emerald-500 shadow-emerald-500/30',
    orange: 'bg-amber-500 shadow-amber-500/30',
    navy:   'bg-navy-800 shadow-navy-500/30',
  };

  return (
    <Card className="group" onClick={onClick}>
      <div className="flex items-center gap-5">
        <div className={cn('p-4 rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110 duration-300', colors[color])}>
          <Icon size={28} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-black text-navy-900 dark:text-white mt-1">{value}</p>
        </div>
      </div>
    </Card>
  );
});
StatCard.displayName = 'StatCard';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export const Skeleton = ({ className, count = 1 }) => (
  <>
    {[...Array(count)].map((_, i) => (
      <div
        key={i}
        className={cn(
          'animate-pulse bg-slate-200 dark:bg-slate-700/50 rounded-2xl',
          className
        )}
      />
    ))}
  </>
);

// ─── Table ────────────────────────────────────────────────────────────────────
export const Table = ({ headers, data, renderRow, loading }) => {
  if (loading) return (
    <div className="p-8 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 bg-slate-200 dark:bg-slate-700/50 rounded-2xl animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-y-2">
        <thead>
          <tr className="text-slate-400">
            {headers.map((h, i) => (
              <th key={i} className="pb-4 px-6 text-[10px] font-black uppercase tracking-[0.2em]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="space-y-4">
          {data.length > 0 ? (
            data.map((item, index) => renderRow(item, index))
          ) : (
            <tr>
              <td colSpan={headers.length} className="py-20 text-center text-slate-400 font-medium">
                Aucune donnée trouvée dans le registre.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ─── Modal ───────────────────────────────────────────────────────────────────
export const Modal = ({ isOpen, onClose, title, children }) => {
  // Fermeture par touche Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-xl shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-10 pb-6">
          <h3 className="text-2xl font-black text-navy-900 dark:text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-10 pb-10">
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── ConfirmDialog ───────────────────────────────────────────────────────────
/**
 * Modale de confirmation pour les actions destructives.
 * Usage :
 *   <ConfirmDialog
 *     isOpen={showConfirm}
 *     title="Supprimer le dossier ?"
 *     message="Cette action est irréversible."
 *     confirmLabel="Supprimer"
 *     variant="danger"
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel  = 'Annuler',
  variant      = 'danger', // 'danger' | 'warning'
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  const btnVariants = {
    danger:  'bg-red-600 hover:bg-red-500 shadow-red-500/20',
    warning: 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20',
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
        <div className="p-8 space-y-4">
          <h3 className="text-xl font-black text-navy-900 dark:text-white tracking-tight">{title}</h3>
          {message && (
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{message}</p>
          )}
        </div>
        <div className="px-8 pb-8 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'px-6 py-2.5 rounded-xl text-white font-black text-sm shadow-lg transition-all disabled:opacity-50 flex items-center gap-2',
              btnVariants[variant] || btnVariants.danger
            )}
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Toast ───────────────────────────────────────────────────────────────────
const TOAST_ICONS = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const TOAST_STYLES = {
  success: 'bg-emerald-600 text-white border-emerald-500',
  error:   'bg-red-600 text-white border-red-500',
  warning: 'bg-amber-500 text-white border-amber-400',
  info:    'bg-navy-900 text-white border-navy-700',
};

export const Toast = ({ message, type = 'info', onClose }) => {
  const [progress, setProgress] = React.useState(100);
  const DURATION = 4000;
  const Icon = TOAST_ICONS[type] || Info;

  React.useEffect(() => {
    const timer = setTimeout(onClose, DURATION);
    const interval = setInterval(() => {
      setProgress(p => Math.max(0, p - (100 / (DURATION / 50))));
    }, 50);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [onClose]);

  return (
    <div className={cn(
      'fixed bottom-8 right-8 z-[200] min-w-[300px] max-w-sm rounded-2xl shadow-2xl border overflow-hidden',
      'animate-in slide-in-from-right-10 duration-300',
      TOAST_STYLES[type]
    )}>
      <div className="flex items-center gap-3 px-5 py-4">
        <Icon size={20} className="shrink-0 opacity-90" />
        <p className="text-sm font-bold flex-1">{message}</p>
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
          <X size={16} />
        </button>
      </div>
      {/* Barre de progression */}
      <div className="h-1 bg-black/10">
        <div
          className="h-full bg-white/40 transition-all ease-linear"
          style={{ width: `${progress}%`, transitionDuration: '50ms' }}
        />
      </div>
    </div>
  );
};
