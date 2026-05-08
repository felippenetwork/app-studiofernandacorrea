import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as any;
    // Axios errors: prefer the message from the API response body
    const apiMessage = e.response?.data?.message ?? e.response?.data?.error;
    if (apiMessage) return apiMessage;
    if (e.message) return e.message;
  }
  if (err instanceof Error) return err.message;
  return 'Erro desconhecido.';
}
