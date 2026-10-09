import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { ToastService } from '../../../../shared/services/toast.service';
import { OpcionesMensaje } from '../../domain/mensaje-whatsapp';

export interface CambioOpcion {
  readonly opcion: keyof OpcionesMensaje;
  readonly valor: boolean;
}

/** Mensaje para el grupo del colegio. Se puede retocar a mano antes de copiarlo. */
@Component({
  selector: 'app-mensaje-whatsapp',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .mensaje-whatsapp { display: grid; gap: 0.9rem; }
    .mensaje-whatsapp h2 { margin: 0.15rem 0 0; font-size: 1.2rem; }
    .mensaje-whatsapp textarea { min-height: 18rem; font-size: 0.92rem; line-height: 1.45; }
    .enlace-deshabilitado { pointer-events: none; opacity: 0.55; }
    @media (max-width: 640px) {
      .header-acciones > * { flex: 1 1 auto; }
    }
  `,
  template: `
    <section class="card mensaje-whatsapp" aria-labelledby="titulo-mensaje">
      <div>
        <p class="eyebrow">Para el grupo del colegio</p>
        <h2 id="titulo-mensaje">Mensaje de WhatsApp</h2>
      </div>

      <div class="chip-row" role="group" aria-label="Qué incluir en el mensaje">
        @if (hayDescuentoCantidad()) {
          <label class="inline-check">
            <input type="checkbox" [checked]="opciones().incluirCantidad" (change)="emitirOpcion('incluirCantidad', $event)" />
            <span>Incluir precio por cantidad</span>
          </label>
        }
        <label class="inline-check">
          <input type="checkbox" [checked]="opciones().ofrecerA5" (change)="emitirOpcion('ofrecerA5', $event)" />
          <span>Ofrecer A5</span>
        </label>
        <label class="inline-check">
          <input type="checkbox" [checked]="opciones().aclararTomos" (change)="emitirOpcion('aclararTomos', $event)" />
          <span>Aclarar tomos</span>
        </label>
      </div>

      <label class="field">
        <span>Texto</span>
        <textarea rows="14" [value]="texto()" (input)="texto.set($any($event.target).value)"></textarea>
        <small class="caption">Podés retocarlo. Si cambiás un precio o una opción, se vuelve a armar.</small>
      </label>

      <div class="header-acciones">
        <button type="button" class="primary-button" [disabled]="!texto()" (click)="copiar()">Copiar</button>
        <a class="secondary-button" [class.enlace-deshabilitado]="!texto()" [attr.href]="enlaceWhatsapp()" target="_blank" rel="noopener">
          Abrir en WhatsApp
        </a>
      </div>
    </section>
  `,
})
export class MensajeWhatsappComponent {
  private readonly toastService = inject(ToastService);

  readonly mensaje = input.required<string>();
  readonly opciones = input.required<OpcionesMensaje>();
  readonly hayDescuentoCantidad = input.required<boolean>();
  readonly cambiarOpcion = output<CambioOpcion>();

  /** Arranca con el mensaje generado; las ediciones a mano duran hasta el proximo cambio de precios. */
  protected readonly texto = linkedSignal(() => this.mensaje());
  protected readonly enlaceWhatsapp = computed(() =>
    this.texto() ? `https://wa.me/?text=${encodeURIComponent(this.texto())}` : null,
  );

  protected emitirOpcion(opcion: keyof OpcionesMensaje, evento: Event): void {
    this.cambiarOpcion.emit({ opcion, valor: (evento.target as HTMLInputElement).checked });
  }

  protected async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.texto());
      this.toastService.success('Mensaje copiado. Pegalo en el grupo.');
    } catch {
      this.toastService.error('No se pudo copiar. Seleccioná el texto y copialo a mano.');
    }
  }
}
