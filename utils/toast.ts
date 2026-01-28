
export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastOptions {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastCallback = (options: ToastOptions) => void;

class ToastManager {
  private listeners: Set<ToastCallback> = new Set();

  subscribe(callback: ToastCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  show(message: string, type: ToastType = 'info', duration: number = 3000) {
    const id = Math.random().toString(36).substring(2, 9);
    this.listeners.forEach(callback => callback({ id, message, type, duration }));
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string) { this.show(msg, 'error'); }
  info(msg: string) { this.show(msg, 'info'); }
  warning(msg: string) { this.show(msg, 'warning'); }
  loading(msg: string) { this.show(msg, 'loading', 0); } // 0 means persistent until manually cleared or replaced
}

export const toast = new ToastManager();
