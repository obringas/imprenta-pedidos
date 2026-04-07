export interface Database {
  public: {
    Tables: {
      libros: {
        Row: {
          id: string;
          titulo: string;
          precio: number;
          paginas: number;
          hojas: number;
          observaciones: string | null;
          margen_ganancia: number;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          precio: number;
          paginas: number;
          observaciones?: string | null;
          margen_ganancia?: number;
          activo?: boolean;
        };
        Update: {
          titulo?: string;
          precio?: number;
          paginas?: number;
          observaciones?: string | null;
          margen_ganancia?: number;
          activo?: boolean;
        };
      };
      configuracion_insumos: {
        Row: {
          id: string;
          clave:
            | 'tapa_paquete'
            | 'tapa_cantidad'
            | 'espiral_paquete'
            | 'espiral_cantidad'
            | 'hojas_resma'
            | 'hojas_cantidad'
            | 'toner_costo'
            | 'toner_impresiones';
          descripcion: string;
          valor: number;
          unidad: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clave:
            | 'tapa_paquete'
            | 'tapa_cantidad'
            | 'espiral_paquete'
            | 'espiral_cantidad'
            | 'hojas_resma'
            | 'hojas_cantidad'
            | 'toner_costo'
            | 'toner_impresiones';
          descripcion: string;
          valor: number;
          unidad: string;
          updated_at?: string;
        };
        Update: {
          clave?: Database['public']['Tables']['configuracion_insumos']['Row']['clave'];
          descripcion?: string;
          valor?: number;
          unidad?: string;
          updated_at?: string;
        };
      };
      pedidos: {
        Row: {
          id: string;
          libro_id: string;
          alumno: string;
          division: string | null;
          precio_cobrado: number;
          estado_impresion: 'Pendiente' | 'Impreso';
          fecha_impresion: string | null;
          estado_entrega: 'Pendiente' | 'Entregado';
          fecha_entrega: string | null;
          estado_pago: 'Pendiente' | 'Seña' | 'Pagado';
          monto_cobrado: number;
          fecha_pago: string | null;
          observaciones: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          libro_id: string;
          alumno: string;
          division?: string | null;
          precio_cobrado: number;
          estado_impresion?: 'Pendiente' | 'Impreso';
          fecha_impresion?: string | null;
          estado_entrega?: 'Pendiente' | 'Entregado';
          fecha_entrega?: string | null;
          estado_pago: 'Pendiente' | 'Seña' | 'Pagado';
          monto_cobrado: number;
          fecha_pago?: string | null;
          observaciones?: string | null;
        };
        Update: {
          libro_id?: string;
          alumno?: string;
          division?: string | null;
          precio_cobrado?: number;
          estado_impresion?: 'Pendiente' | 'Impreso';
          fecha_impresion?: string | null;
          estado_entrega?: 'Pendiente' | 'Entregado';
          fecha_entrega?: string | null;
          estado_pago?: 'Pendiente' | 'Seña' | 'Pagado';
          monto_cobrado?: number;
          fecha_pago?: string | null;
          observaciones?: string | null;
        };
      };
    };
    Views: {
      pedidos_detalle: {
        Row: {
          id: string;
          libro_id: string;
          libro_titulo: string;
          libro_paginas: number;
          libro_hojas: number;
          alumno: string;
          division: string | null;
          precio_cobrado: number;
          estado_impresion: 'Pendiente' | 'Impreso';
          fecha_impresion: string | null;
          estado_entrega: 'Pendiente' | 'Entregado';
          fecha_entrega: string | null;
          estado_pago: 'Pendiente' | 'Seña' | 'Pagado';
          monto_cobrado: number;
          fecha_pago: string | null;
          saldo: number;
          estado_general: string;
          observaciones: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      informes_resumen_por_libro: {
        Row: {
          libro_id: string;
          libro_titulo: string;
          libro_precio: number;
          libro_hojas: number;
          total_pedidos: number;
          total_a_cobrar: number;
          total_cobrado: number;
          saldo_total: number;
          total_impresos: number;
          total_entregados: number;
          total_cerrados: number;
          hojas_pendientes: number;
        };
      };
    };
  };
}
