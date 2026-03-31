export type ErrorCodigo =
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'UNEXPECTED'
  | 'CONSTRAINT'
  | 'DUPLICATE'
  | 'AUTH';

export class AppError {
  constructor(
    public readonly codigo: ErrorCodigo,
    public readonly mensaje: string,
    public readonly causa?: unknown,
  ) {}

  static noEncontrado(recurso: string): AppError {
    return new AppError('NOT_FOUND', `${recurso} no encontrado`);
  }

  static validacion(campo: string, detalle: string): AppError {
    return new AppError('VALIDATION', `${campo}: ${detalle}`);
  }

  static inesperado(causa: unknown): AppError {
    return new AppError('UNEXPECTED', 'Error inesperado. Intentá de nuevo.', causa);
  }
}
