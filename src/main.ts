import { inject, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { AuthStore } from './app/core/auth/auth.store';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    // Sin PreloadAllModules: precargaría en segundo plano las pantallas protegidas con canMatch
    provideRouter(routes, withComponentInputBinding()),
    // Registro global del interceptor: TODAS las peticiones de HttpClient pasan por él
    provideHttpClient(withInterceptors([authInterceptor])),
    // La sesión de Supabase se restaura antes de evaluar ningún guard (F5 no expulsa al usuario)
    provideAppInitializer(() => inject(AuthStore).init()),
  ],
});
