// Standard API envelope wrapping every backend response

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}

// Body of a failed response (available on HttpErrorResponse.error)
export interface ApiErrorBody {
  success: false;
  statusCode: number;
  message: string;
  errors?: ApiFieldError[];
}

// Field-level validation error item (422 responses)
export interface ApiFieldError {
  msg: string;
  path?: string;
}

// Pagination fields shared by list payloads (inside `data`)
export interface PaginatedData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Responses whose payload carries no data (mutations, password flows, ...)
export type ApiMessage = ApiResponse<Record<string, never>>;
