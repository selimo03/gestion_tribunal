import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '../components/UI';

const NotificationContext = createContext(null);

/**
 * Provider global — à placer autour de <App />.
 * Expose showToast(message, type?) à tous les composants enfants.
 * Types disponibles : 'info' | 'success' | 'error' | 'warning'
 */
export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      {notification && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={hideToast}
        />
      )}
    </NotificationContext.Provider>
  );
}

/**
 * Hook à utiliser dans n'importe quel composant :
 *   const { showToast } = useNotification();
 *   showToast('Dossier créé !', 'success');
 */
export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification doit être utilisé à l\'intérieur de NotificationProvider');
  return ctx;
}
