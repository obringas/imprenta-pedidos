import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'peso',
  standalone: true,
  pure: true,
})
export class PesoPipe implements PipeTransform {
  /** `decimales` sirve para costos unitarios chicos, como el toner por cara ($6,92). */
  transform(valor: number | null | undefined, decimales = 0): string {
    if (valor == null) {
      return '-';
    }

    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(valor);
  }
}
