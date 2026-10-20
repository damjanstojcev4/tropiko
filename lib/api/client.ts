export class ApiError extends Error {
  constructor(message: string, public status = 0, public param?: string, public details?: string) { super(message); this.name = "ApiError"; }
}
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Барањето не успеа. Обидете се повторно.";
}
export function isAuthorizationError(error: unknown): boolean { return error instanceof ApiError && (error.status === 401 || error.status === 403); }
export function databaseError(error: { message: string; code?: string; status?: number }): ApiError {
  const status = error.status || (error.code === "42501" ? 403 : ["PGRST301", "PGRST302", "PGRST303"].includes(error.code || "") ? 401 : error.code === "23505" ? 409 : ["23514", "23502", "22P02"].includes(error.code || "") ? 400 : 500);
  return new ApiError(error.message, status);
}
