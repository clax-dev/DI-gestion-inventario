// Genera src/environments/environment*.ts a partir de variables de entorno.
// - En local las lee del archivo .env (ignorado por Git).
// - En Vercel se definen en Project Settings → Environment Variables.
// Así las claves de Supabase nunca se suben al repositorio.
import { writeFileSync, mkdirSync } from 'node:fs';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('[set-env] Faltan SUPABASE_URL y/o SUPABASE_KEY (crea el archivo .env a partir de .env.example)');
  process.exit(1);
}

const contenido = (production) => `// ARCHIVO GENERADO por scripts/set-env.mjs — no editar ni subir a Git
export const environment = {
  production: ${production},
  supabaseUrl: '${url}',
  supabaseKey: '${key}',
};
`;

mkdirSync('src/environments', { recursive: true });
writeFileSync('src/environments/environment.ts', contenido(false));
writeFileSync('src/environments/environment.prod.ts', contenido(true));
console.log('[set-env] environment.ts y environment.prod.ts generados');
