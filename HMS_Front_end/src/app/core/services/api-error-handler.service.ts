import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../models/api-response.model';
import { APP_MESSAGES } from '../constants/messages';

// Turns a failed HTTP call into a user-facing message for components
@Injectable({ providedIn: 'root' })
export class ApiErrorHandlerService {
  message(err: unknown, fallback: string = APP_MESSAGES.GENERIC_ERROR): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as ApiErrorBody | undefined;

      // First field-level msg beats the generic top-level validation message
      if (err.status === 422 && body?.errors?.length) {
        return body.errors[0].msg;
      }

      return body?.message || fallback;
    }
    return fallback;
  }
}
