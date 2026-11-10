import { HttpErrorResponse } from '@angular/common/http';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

export function toErrorMessage(error: unknown, fallback = FALLBACK_MESSAGE): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message;

      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }

    if (error.status === 0) {
      return 'The service is unavailable. Check your connection and try again.';
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return fallback;
}
