import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog.component';
import { EstadoBadgeComponent } from '../../../../shared/components/estado-badge.component';
import { PesoPipe } from '../../../../shared/pipes/peso.pipe';
import { ToastService } from '../../../../shared/services/toast.service';
import { PedidosFacade } from '../../state/pedidos.facade';
import { PedidoFormComponent } from '../components/pedido-form.component';

@Component({
  selector: 'app-pedido-detalle-page',
  standalone: true,
  imports: [PedidoFormComponent, EstadoBadgeComponent, PesoPipe, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pedido(); as pedidoActual) {
      <section class="page-header">
        <div>
          <p class="eyebrow">Detalle</p>
          <h1>{{ pedidoActual.alumno }}</h1>
          <p class="page-description">{{ pedidoActual.libroTitulo }}</p>
        </div>
        <div class="badge-row">
          <app-estado-badge [estado]="pedidoActual.estadoGeneral" />
          <strong [class.text-danger]="pedidoActual.saldo > 0">{{ pedidoActual.saldo | peso }}</strong>
        </div>
      </section>

      <app-pedido-form [pedido]="pedidoActual" [modoDetalle]="true" cta="Guardar cambios" (formSubmitted)="guardar($event)" />
      <button type="button" class="danger-button full-width" (click)="confirmDeleteOpen.set(true)">Eliminar pedido</button>

      <app-confirm-dialog
        [open]="confirmDeleteOpen()"
        title="Eliminar pedido"
        description="Se eliminará el pedido y no se podrá recuperar. Confirmá solo si estás segura."
        confirmLabel="Eliminar pedido"
        (cancelled)="confirmDeleteOpen.set(false)"
        (confirmed)="confirmarEliminacion()"
      />
    } @else {
      <section class="card"><h2>Pedido no encontrado</h2></section>
    }
  `,
})
export class PedidoDetallePageComponent {
  private readonly facade = inject(PedidosFacade);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly id = input.required<string>();
  protected readonly pedido = computed(() => this.facade.obtenerPorId(this.id()));
  protected readonly confirmDeleteOpen = signal(false);

  constructor() {
    effect(() => {
      void this.facade.cargar();
    });
  }

  protected async guardar(payload: Record<string, unknown>): Promise<void> {
    const result = await this.facade.actualizarPedido(this.id(), payload);
    if (result.success) {
      this.toastService.success('Pedido actualizado correctamente.');
      await this.router.navigateByUrl('/pedidos');
      return;
    }

    this.toastService.error(result.error.mensaje);
  }

  protected async confirmarEliminacion(): Promise<void> {
    this.confirmDeleteOpen.set(false);
    await this.facade.eliminarPedido(this.id());
    this.toastService.success('Pedido eliminado.');
    await this.router.navigateByUrl('/pedidos');
  }
}
