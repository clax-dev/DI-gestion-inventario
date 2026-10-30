import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { AuthStore } from './core/auth/auth.store';

describe('AppComponent', () => {
  beforeEach(async () => {
    const authFalso = { isAuthenticated: signal(false), email: signal(''), rol: signal(null), can: () => false };
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: AuthStore, useValue: authFalso }],
    }).compileComponents();
  });

  it('se crea la aplicación', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('sin permisos el menú no muestra las pantallas restringidas', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Cuadro de mando');
    expect(texto).toContain('Pedidos');
  });
});
