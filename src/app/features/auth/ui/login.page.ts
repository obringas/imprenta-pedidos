import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-shell">
      <section class="login-card card">
        <p class="eyebrow">Acceso</p>
        <h1>Pedidos de imprenta</h1>
        <p class="page-description">
          {{ descripcionAcceso() }}
        </p>

        <form class="form-grid" [formGroup]="form" (ngSubmit)="ingresar()">
          <label class="field">
            <span>Email</span>
            <input type="email" formControlName="email" placeholder="duena@imprenta.com" [class.input-invalid]="mostrarError('email')" />
            @if (mostrarError('email')) {
              <small class="field-error">{{ mensajeErrorEmail() }}</small>
            }
          </label>

          <label class="field">
            <span>Contraseña</span>
            <input type="password" formControlName="password" placeholder="Ingresá tu contraseña" [class.input-invalid]="mostrarError('password')" />
            @if (mostrarError('password')) {
              <small class="field-error">Ingresá una contraseña para continuar.</small>
            }
          </label>

          @if (authService.error()) {
            <p class="field-error">{{ authService.error() }}</p>
          }

          <button type="submit" class="primary-button" [disabled]="form.invalid">Entrar</button>
        </form>
      </section>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly descripcionAcceso = computed(() =>
    this.authService.usandoSupabase()
      ? 'Ingresá con tu usuario de Supabase para trabajar con los datos reales.'
      : 'Completá las credenciales de Supabase en environment para activar el login real. Mientras tanto, sigue disponible el modo local.',
  );

  protected mostrarError(campo: 'email' | 'password'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected mensajeErrorEmail(): string {
    const control = this.form.controls.email;
    if (control.hasError('required')) {
      return 'Ingresá un email para continuar.';
    }

    return 'El email no tiene un formato válido.';
  }

  protected async ingresar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    const ok = await this.authService.iniciarSesion(email, password);

    if (ok) {
      await this.router.navigateByUrl('/pedidos');
    }
  }
}
