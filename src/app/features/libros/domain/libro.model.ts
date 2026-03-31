export interface Libro {
  readonly id: string;
  readonly titulo: string;
  readonly precio: number;
  readonly paginas: number;
  readonly hojas: number;
  readonly observaciones: string | null;
  readonly activo: boolean;
}

export interface CrearLibroInput {
  readonly titulo: string;
  readonly precio: number;
  readonly paginas: number;
  readonly observaciones: string | null;
}

export interface ActualizarLibroInput extends CrearLibroInput {
  readonly activo: boolean;
}
