import { ClaveInsumo, ConfiguracionInsumo, reglaDeInsumo } from '../../../shared/models/configuracion-insumos.model';
import { agruparInsumos } from './grupos-insumo';

function insumo(clave: string): ConfiguracionInsumo {
  return {
    id: clave,
    clave: clave as ClaveInsumo,
    descripcion: clave,
    tipo: reglaDeInsumo(clave).tipo,
    valor: 1,
    valorTexto: null,
    unidad: '',
    updatedAt: '2026-10-09T00:00:00Z',
  };
}

describe('agruparInsumos', () => {
  it('debería agrupar por bloque en el orden de la pantalla', () => {
    const grupos = agruparInsumos([insumo('whatsapp_firma'), insumo('hojas_resma'), insumo('tapa_a5_paquete')]);
    expect(grupos.map((grupo) => grupo.titulo)).toEqual(['Papel', 'Espiral y tapa', 'Mensaje']);
  });

  it('debería ocultar las claves deprecadas del toner viejo', () => {
    const grupos = agruparInsumos([insumo('toner_costo'), insumo('toner_impresiones'), insumo('toner_negro_costo')]);
    const claves = grupos.flatMap((grupo) => grupo.insumos.map((item) => item.clave));
    expect(claves).toEqual(['toner_negro_costo']);
  });

  it('debería mostrar en "Otros" una clave que no pertenece a ningún bloque', () => {
    const grupos = agruparInsumos([insumo('clave_nueva')]);
    expect(grupos).toEqual([{ titulo: 'Otros', insumos: [jasmine.objectContaining({ clave: 'clave_nueva' })] }]);
  });
});
