import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { catchError, map, Observable, of, switchMap, timer } from 'rxjs';
import { ProductosApi } from '../api/productos.api';

/**
 * Validador ASÍNCRONO: comprueba contra la API que el SKU no esté ya registrado.
 * - timer(400): espera a que el usuario deje de escribir (debounce) → menos peticiones
 * - switchMap: si se escribe otra letra, cancela la petición anterior
 * - Mientras se comprueba, el control queda en estado PENDING (la vista muestra un spinner)
 *
 * @param api      servicio de productos
 * @param excluirId id del producto que se está editando (su propio SKU no cuenta como duplicado)
 */
export function skuDisponibleValidator(api: ProductosApi, excluirId?: () => number | undefined): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const sku = String(control.value ?? '').trim();
    if (!sku) {
      return of(null);
    }
    return timer(400).pipe(
      switchMap(() => api.existeSku(sku, excluirId?.())),
      map(existe => (existe ? { skuDuplicado: true } : null)),
      catchError(() => of(null)), // si la API falla no bloqueamos el formulario; lo frenará la restricción UNIQUE
    );
  };
}
