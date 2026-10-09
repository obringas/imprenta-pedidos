import { ClaveInsumo } from '../../shared/models/configuracion-insumos.model';

export interface Database {
  public: {
    Tables: {
      libros: {
        Row: {
          id: string;
          titulo: string;
          precio_a4: number | null;
          precio_a5: number;
          paginas: number;
          hojas: number;
          observaciones: string | null;
          margen_ganancia: number;
          tipo_impresion: 'bn' | 'poco_color' | 'color_pleno' | 'mixto';
          paginas_color: number;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          precio_a4?: number | null;
          precio_a5: number;
          paginas: number;
          observaciones?: string | null;
          margen_ganancia?: number;
          tipo_impresion?: 'bn' | 'poco_color' | 'color_pleno' | 'mixto';
          paginas_color?: number;
          activo?: boolean;
        };
        Update: {
          titulo?: string;
          precio_a4?: number | null;
          precio_a5?: number;
          paginas?: number;
          observaciones?: string | null;
          margen_ganancia?: number;
          tipo_impresion?: 'bn' | 'poco_color' | 'color_pleno' | 'mixto';
          paginas_color?: number;
          activo?: boolean;
        };
      };
      configuracion_insumos: {
        Row: {
          id: string;
          clave: ClaveInsumo;
          descripcion: string;
          valor: number;
          valor_texto: string | null;
          unidad: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clave: ClaveInsumo;
          descripcion: string;
          valor: number;
          valor_texto?: string | null;
          unidad: string;
          updated_at?: string;
        };
        Update: {
          clave?: Database['public']['Tables']['configuracion_insumos']['Row']['clave'];
          descripcion?: string;
          valor?: number;
          valor_texto?: string | null;
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
          tamanio: 'A4' | 'A5';
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
          tamanio: 'A4' | 'A5';
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
          tamanio?: 'A4' | 'A5';
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
          tamanio: 'A4' | 'A5';
        };
      };
      informes_resumen_por_libro: {
        Row: {
          libro_id: string;
          libro_titulo: string;
          libro_precio_a4: number | null;
          libro_precio_a5: number;
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
