import { computed, inject, Injectable, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { DocumentoActividad } from '../models';
import { SupabaseService } from '../services/supabase.service';

export type EstadoConexion = 'desconectado' | 'conectando' | 'conectado' | 'error';

/**
 * Fuente de datos en TIEMPO REAL basada en documentos (parte "NoSQL" del proyecto).
 * A diferencia de la API REST (petición → respuesta), aquí el servidor EMPUJA cada documento nuevo
 * por WebSocket (Supabase Realtime), igual que un listener de Firestore.
 */
@Injectable({ providedIn: 'root' })
export class ActividadStore {
  private readonly supabase = inject(SupabaseService).client;
  private canal: RealtimeChannel | null = null;
  private suscriptores = 0;

  private readonly _documentos = signal<DocumentoActividad[]>([]);
  private readonly _estado = signal<EstadoConexion>('desconectado');

  readonly documentos = this._documentos.asReadonly();
  readonly estado = this._estado.asReadonly();
  /** Último documento recibido: otras vistas (dashboard) reaccionan a él con effect(). */
  readonly ultimo = computed(() => this._documentos()[0] ?? null);

  /** Carga el historial y abre la suscripción. Cada vista que llama a conectar() debe llamar a desconectar(). */
  async conectar(): Promise<void> {
    this.suscriptores++;
    if (this.canal) return;

    this._estado.set('conectando');
    const { data, error } = await this.supabase
      .from('actividad').select('*').order('creado_en', { ascending: false }).limit(50);
    if (error) {
      this._estado.set('error');
      return;
    }
    this._documentos.set((data ?? []) as DocumentoActividad[]);

    this.canal = this.supabase
      .channel('actividad-en-vivo')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'actividad' }, cambio => {
        const doc = cambio.new as DocumentoActividad;
        this._documentos.update(lista => [doc, ...lista].slice(0, 50));
      })
      .subscribe(estado => {
        this._estado.set(estado === 'SUBSCRIBED' ? 'conectado' : estado === 'CHANNEL_ERROR' ? 'error' : 'conectando');
      });
  }

  /** Cierra el WebSocket cuando ya no lo usa ninguna vista (evita fugas de memoria). */
  async desconectar(): Promise<void> {
    this.suscriptores = Math.max(0, this.suscriptores - 1);
    if (this.suscriptores > 0 || !this.canal) return;
    await this.supabase.removeChannel(this.canal);
    this.canal = null;
    this._estado.set('desconectado');
  }
}
