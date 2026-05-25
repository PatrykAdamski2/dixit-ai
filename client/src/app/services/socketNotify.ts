import { toast } from 'sonner';

export function notifySocketError(message: string) {
  toast.error(message, { id: 'socket-error' });
}

export function notifyInfo(message: string) {
  toast.info(message);
}

export function notifySuccess(message: string) {
  toast.success(message);
}
