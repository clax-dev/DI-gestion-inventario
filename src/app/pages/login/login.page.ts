import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent,
  IonHeader, IonInput, IonNote, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/angular';
import { AuthStore } from '../../core/auth/auth.store';
import { INICIO_POR_ROL } from '../../core/auth/permisos';

/** Pantalla de inicio de sesión (formulario reactivo con validación síncrona). */
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonInput, IonButton, IonText, IonNote, IonSpinner,
  ],
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly cargando = signal(false);
  readonly error = signal('');

  async entrar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    const fallo = await this.auth.login(email, password);
    this.cargando.set(false);

    if (fallo) {
      this.error.set(fallo);
      return;
    }
    // Redirección contextual: vuelve a la URL que se pidió antes del login (si no, al inicio de su rol).
    // Si esa URL no está permitida para su rol, el propio guard le reconduce.
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    await this.router.navigateByUrl(returnUrl ?? INICIO_POR_ROL[this.auth.rol() ?? 'usuario'], { replaceUrl: true });
  }
}
