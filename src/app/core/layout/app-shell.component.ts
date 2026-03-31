import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastOutletComponent } from '../../shared/components/toast-outlet.component';
import { AuthService } from '../auth/auth.service';

type NavItem = {
  readonly label: string;
  readonly ruta: string;
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastOutletComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">Pedidos Imprenta</p>
          <h1>Producción diaria</h1>
          <p class="caption">{{ usuarioActual() }}</p>
        </div>

        <nav class="nav-list" aria-label="Navegación principal">
          @for (item of navItems; track item.ruta) {
            <a [routerLink]="item.ruta" routerLinkActive="nav-item-active" class="nav-item" [attr.aria-label]="'Ir a ' + item.label">
              {{ item.label }}
            </a>
          }
        </nav>

        <button type="button" class="secondary-button" (click)="cerrarSesion()" aria-label="Cerrar la sesión actual">
          Cerrar sesión
        </button>
      </aside>

      <div class="content-area">
        <main class="page-container" id="contenido-principal">
          <router-outlet />
        </main>

        <nav class="bottom-nav" aria-label="Navegación inferior">
          @for (item of navItems; track item.ruta) {
            <a [routerLink]="item.ruta" routerLinkActive="bottom-nav-active" class="bottom-nav-item" [attr.aria-label]="'Ir a ' + item.label">
              {{ item.label }}
            </a>
          }
        </nav>
      </div>
    </div>

    <app-toast-outlet />
  `,
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Pedidos', ruta: '/pedidos' },
    { label: 'Libros', ruta: '/libros' },
    { label: 'Informes', ruta: '/informes' },
  ];

  protected readonly usuarioActual = computed(() => this.authService.usuario() ?? 'Sesión local');

  protected async cerrarSesion(): Promise<void> {
    await this.authService.cerrarSesion();
  }
}
