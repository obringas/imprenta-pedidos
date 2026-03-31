import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'peso',
  standalone: true,
  pure: true,
})
export class PesoPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    if (valor == null) {
      return '-';
    }

    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(valor);
  }
}

