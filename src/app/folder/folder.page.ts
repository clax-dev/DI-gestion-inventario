import { Component, input, inject, signal, OnInit } from '@angular/core';   // NUEVO: inject, signal, OnInit
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent } from '@ionic/angular';
import { SupabaseService } from '../core/services/supabase.service';      // NUEVO

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent],
})
export class FolderPage implements OnInit {                                  // NUEVO: implements OnInit
  readonly folder = input.required<string>();

  private supabase = inject(SupabaseService);                               // NUEVO
  estadoConexion = signal('Comprobando conexión...');                       // NUEVO

  async ngOnInit() {                                                        // NUEVO (todo el método)
    const { error } = await this.supabase.client.from('productos').select('*');

    if (!error || error.code) {
      this.estadoConexion.set('✅ Conectado a Supabase');
    } else {
      this.estadoConexion.set('❌ Error de conexión: ' + error.message);
    }
  }
}
