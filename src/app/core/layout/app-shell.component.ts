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
        <div class="brand brand-panel">
          <img src="logo.png" alt="BrujitaCandyBar" class="brand-logo" />
          <div>
            <p class="eyebrow">BrujitaCandyBar</p>
            <h1>Pedidos de Impresion</h1>
            <p class="caption">{{ usuarioActual() }}</p>
          </div>
        </div>

        <nav class="nav-list" aria-label="Navegacion principal">
          @for (item of navItems; track item.ruta) {
            <a [routerLink]="item.ruta" routerLinkActive="nav-item-active" class="nav-item" [attr.aria-label]="'Ir a ' + item.label">
              {{ item.label }}
            </a>
          }
        </nav>

        <button type="button" class="secondary-button logout-button" (click)="cerrarSesion()" aria-label="Cerrar la sesion actual">
          Cerrar sesion
        </button>
      </aside>

      <div class="content-area">
        <header class="mobile-topbar mobile-only" aria-label="Barra superior">
          <div class="mobile-brand">
            <img src="logo.png" alt="BrujitaCandyBar" class="mobile-brand-logo" />
            <div>
              <p class="eyebrow">BrujitaCandyBar</p>
              <strong>Pedidos</strong>
            </div>
          </div>
          <button type="button" class="mobile-logout-button" (click)="cerrarSesion()" aria-label="Cerrar la sesion actual">
            Salir
          </button>
        </header>

        <main class="page-container" id="contenido-principal">
          <router-outlet />
        </main>

        <nav class="bottom-nav" aria-label="Navegacion inferior">
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

  protected readonly usuarioActual = computed(() => this.authService.usuario() ?? 'Sesion local');

  protected async cerrarSesion(): Promise<void> {
    await this.authService.cerrarSesion();
  }
}
