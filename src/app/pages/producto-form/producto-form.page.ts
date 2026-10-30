import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonNote, IonSpinner, IonText, IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { mensajeDeError } from '../../core/api/error-api';
import { ProductosApi } from '../../core/api/productos.api';
import { ConCambiosPendientes } from '../../core/guards/unsaved-changes.guard';
import { NotificacionService } from '../../core/services/notificacion.service';
import { ProductosStore } from '../../core/state/productos.store';
import { skuDisponibleValidator } from '../../core/validators/sku-disponible.validator';

/**
 * Alta y edición de productos (solo admin, ruta protegida con canMatch).
 * Formulario reactivo con validaciones síncronas y una ASÍNCRONA (SKU no repetido contra la API).
 * Implementa ConCambiosPendientes para el guard canDeactivate.
 */
@Component({
  selector: 'app-producto-form',
  templateUrl: './producto-form.page.html',
  styleUrls: ['./producto-form.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonInput,
    IonButton, IonSpinner, IonText, IonNote,
  ],
})
export class ProductoFormPage implements OnInit, ConCambiosPendientes {
  /** Parámetro :id de la ruta (withComponentInputBinding). Vacío → alta. */
  readonly id = input<string>();

  private readonly api = inject(ProductosApi);
  private readonly store = inject(ProductosStore);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionService);

  protected readonly esEdicion = computed(() => !!this.id());
  protected readonly guardando = signal(false);
  private guardado = false;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    sku: ['', {
      validators: [Validators.required, Validators.pattern(/^[A-Z]{3}-\d{3}$/)],
      asyncValidators: [skuDisponibleValidator(this.api, () => (this.id() ? Number(this.id()) : undefined))],
    }],
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
    categoria: ['', [Validators.required]],
    precio: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
  });

  protected readonly c = this.form.controls;

  async ngOnInit(): Promise<void> {
    if (!this.esEdicion()) return;
    try {
      const p = await firstValueFrom(this.api.obtener(Number(this.id())));
      this.form.patchValue(p);
      this.form.markAsPristine();
    } catch (e) {
      await this.avisos.error(mensajeDeError(e));
    }
  }

  /** El SKU se guarda siempre en mayúsculas. */
  protected aMayusculas(): void {
    this.c.sku.setValue(this.c.sku.value.toUpperCase(), { emitEvent: true });
  }

  tieneCambiosSinGuardar(): boolean {
    return this.form.dirty && !this.guardado;
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const datos = { ...this.form.getRawValue(), precio: Number(this.c.precio.value), stock: Number(this.c.stock.value) };
    try {
      if (this.esEdicion()) {
        await this.store.actualizar(Number(this.id()), datos);
      } else {
        await this.store.crear(datos);
      }
      this.guardado = true;
      await this.avisos.exito(this.esEdicion() ? 'Producto actualizado' : 'Producto creado');
      await this.router.navigate(['/productos']);
    } catch (e) {
      await this.avisos.error(mensajeDeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  /** ¿Mostrar el error de un control? Solo tras tocarlo, para no agobiar al usuario. */
  protected mostrarError(control: keyof typeof this.c): boolean {
    const ctrl = this.c[control];
    return ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }
}
