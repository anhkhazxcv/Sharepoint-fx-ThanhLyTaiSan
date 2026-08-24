import * as React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './ToastProvider.module.scss';

export type TToastVariant = 'success' | 'error' | 'info';

export interface IToastContextValue {
  showToast: (message: string, variant?: TToastVariant) => void;
}

const ToastContext = React.createContext<IToastContextValue>({
  showToast: () => undefined
});

export interface IToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider(props: IToastProviderProps): React.ReactElement {
  const showToast = React.useCallback((message: string, variant: TToastVariant = 'info'): void => {
    if (variant === 'success') {
      toast.success(message);
      return;
    }

    if (variant === 'error') {
      toast.error(message);
      return;
    }

    toast.info(message);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {props.children}
      <ToastContainer
        className={styles.toastContainer}
        toastClassName={styles.toastBody}
        position="top-right"
        autoClose={4000}
        limit={4}
        hideProgressBar
        closeOnClick
        pauseOnHover
        draggable={false}
        newestOnTop
        style={{ zIndex: 9999 }}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): IToastContextValue {
  return React.useContext(ToastContext);
}
