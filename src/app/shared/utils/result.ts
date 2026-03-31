import { AppError } from '../errors/app-error';

export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

export const Result = {
  ok<T>(data: T): Result<T> {
    return { success: true, data };
  },
  error<E>(error: E): Result<never, E> {
    return { success: false, error };
  },
};

