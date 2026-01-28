
export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastOptions {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  title?: string;
}

type ToastCallback = (options: ToastOptions) => void;

class ToastManager {
  private listeners: Set<ToastCallback> = new Set();

  subscribe(callback: ToastCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  show(message: string, type: ToastType = 'info', duration: number = 3000, title?: string) {
    const id = Math.random().toString(36).substring(2, 9);
    this.listeners.forEach(callback => callback({ id, message, type, duration, title }));
  }

  success(msg: string, duration?: number, title?: string) { this.show(msg, 'success', duration, title); }
  error(msg: string, duration?: number, title?: string) { this.show(msg, 'error', duration, title); }
  info(msg: string, duration?: number, title?: string) { this.show(msg, 'info', duration, title); }
  warning(msg: string, duration?: number, title?: string) { this.show(msg, 'warning', duration, title); }
  loading(msg: string) { this.show(msg, 'loading', 0); } 
}

export const toast = new ToastManager();
