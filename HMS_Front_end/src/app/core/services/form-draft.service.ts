import { Injectable } from '@angular/core';

// In-memory, session-only form draft store; password-like fields are never stored
@Injectable({
  providedIn: 'root',
})
export class FormDraftService {
  // draftKey -> sanitized form value snapshot
  private readonly drafts = new Map<string, Record<string, any>>();

  // Field-name fragments that must never be persisted
  private static readonly SENSITIVE_FRAGMENTS = [
    'password',
    'passwd',
    'pwd',
  ];

  // Saves the draft for a key, deep-cloned and stripped of password-like fields
  save(key: string, value: Record<string, any>): void {
    if (!key || value == null) {
      return;
    }
    const sanitized = this.sanitize(value);
    this.drafts.set(key, sanitized);
  }

  // Returns the saved draft for a key, or null if none exists
  get(key: string): Record<string, any> | null {
    const draft = this.drafts.get(key);
    // Return a clone so callers can't mutate the stored copy
    return draft ? this.clone(draft) : null;
  }

  // Clears the draft for a key (call after a successful submit)
  clear(key: string): void {
    this.drafts.delete(key);
  }

  // Clears every draft (e.g. on logout)
  clearAll(): void {
    this.drafts.clear();
  }

  // Recursively removes password-like keys and deep-clones the rest
  private sanitize(value: any): any {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        if (this.isSensitiveKey(k)) {
          continue;
        }
        result[k] = this.sanitize(v);
      }
      return result;
    }

    // primitive
    return value;
  }

  private isSensitiveKey(key: string): boolean {
    const lower = key.toLowerCase();
    return FormDraftService.SENSITIVE_FRAGMENTS.some((frag) =>
      lower.includes(frag),
    );
  }

  private clone(value: any): any {
    // Drafts are sanitized plain form values, safe for structuredClone
    return structuredClone(value);
  }
}
