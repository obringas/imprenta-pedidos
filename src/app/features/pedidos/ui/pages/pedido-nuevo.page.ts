import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../../../shared/services/toast.service';
import { PedidoFormComponent } from '../components/pedido-form.component';
import { PedidosFacade } from '../../state/pedidos.facade';

@Component({
  selector: 'app-pedido-nuevo-page',
  standalone: true,
  imports: [PedidoFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-header page-header-compact">
      <div>
        <p class="eyebrow">Carga rápida</p>
        <h1>Nuevo pedido</h1>
        <p class="page-description">Alta pensada para resolver la carga en pocos toques.</p>
      </div>
    </section>

    <app-pedido-form cta="Guardar pedido" (formSubmitted)="guardar($event)" />
  `,
})
export class PedidoNuevoPageComponent {
  private readonly facade = inject(PedidosFacade);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  constructor() {
    effect(() => {
      void this.facade.cargar();
    });
  }

  protected async guardar(payload: Record<string, unknown>): Promise<void> {
    const result = await this.facade.crearPedido(payload);
    if (result.success) {
      this.toastService.success('Pedido creado correctamente.');
      await this.router.navigateByUrl('/pedidos');
      return;
    }

    this.toastService.error(result.error.mensaje);
  }
}
