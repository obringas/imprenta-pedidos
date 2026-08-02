import { Injectable } from '@angular/core';
import writeXlsxFile from 'write-excel-file/browser';
import { normalizarParaBusqueda } from '../../../shared/utils/text-normalizer';

export interface FilaListado {
  readonly alumno: string;
  readonly curso: string;
}

/** La libreria exige el numeral. Es el dorado de la marca (--brand-gold). */
const ENCABEZADO_FONDO = '#F2A300';

/**
 * Genera el .xlsx del listado por curso.
 *
 * Aislado en un servicio para que la pagina no dependa de la libreria de
 * Excel: si mas adelante se cambia el formato de salida, solo cambia esto.
 */
@Injectable({ providedIn: 'root' })
export class ExportarListadoService {
  async descargar(filas: readonly FilaListado[], nombreArchivo: string): Promise<void> {
    const hoja = writeXlsxFile(
      [
        [
          { value: 'Alumno', fontWeight: 'bold', backgroundColor: ENCABEZADO_FONDO },
          { value: 'Grado - División', fontWeight: 'bold', backgroundColor: ENCABEZADO_FONDO },
        ],
        ...filas.map((fila) => [{ value: fila.alumno }, { value: fila.curso }]),
      ],
      {
        sheet: 'Listado',
        columns: [{ width: 34 }, { width: 18 }],
        stickyRowsCount: 1,
      },
    );

    await hoja.toFile(nombreArchivo);
  }

  /**
   * Arma un nombre de archivo legible y seguro para Windows, sin acentos ni
   * caracteres que el sistema de archivos rechace.
   */
  construirNombreArchivo(libroTitulo: string, curso: string): string {
    const partes = [libroTitulo, curso]
      .map((parte) => this.aSlug(parte))
      .filter((parte) => parte.length > 0);

    return `pedidos-${partes.join('-') || 'listado'}.xlsx`;
  }

  private aSlug(valor: string): string {
    return normalizarParaBusqueda(valor)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
