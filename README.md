# Gestión de inventario y pedidos

Aplicación multiplataforma (PWA) de gestión empresarial para el inventario y los pedidos de una tienda o almacén.
Proyecto de la **Actividad individual 1** de Desarrollo de Interfaces (0488) · DAM 2 · Guillermo Prat Astillero.

- **Producción:** https://di-gestion-inventario.vercel.app
- **Documentación técnica (Compodoc):** https://di-gestion-inventario.vercel.app/documentacion/
- **Memoria de seguridad:** [docs/security-architecture.md](docs/security-architecture.md)

> Las credenciales de prueba (administrador y usuario estándar) se entregan en el documento PDF de la entrega, no en el repositorio.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Interfaz | Ionic 9 + Angular 22 (standalone, signals, `OnPush`, control flow `@if/@for`) |
| Navegación | Menú lateral (`ion-split-pane`) con rutas *lazy* (`loadComponent`) |
| Datos SQL | PostgreSQL en Supabase consumido por su **API REST** con `HttpClient` (Observables) |
| Datos en tiempo real | Colección de documentos `jsonb` con **Supabase Realtime** (WebSocket) |
| Seguridad | Supabase Auth (JWT), RBAC con permisos, guards funcionales, interceptor HTTP, Row Level Security |
| Gráficos / informes | Chart.js · jsPDF + autotable · CSV |
| Calidad | Vitest (pruebas unitarias), GitHub Actions, Compodoc, Lighthouse |
| Despliegue | Vercel conectado a GitHub (rama `main`) |

## Arquitectura (MVVM + Store)

```
src/app/
├── core/
│   ├── api/          Servicios REST (acceso a datos SQL)
│   ├── state/        Stores con signals (estado predecible: solo se modifica con métodos)
│   ├── auth/         AuthStore (sesión, token, rol) y mapa rol → permisos
│   ├── guards/       authGuard, permissionGuard (canMatch), unsavedChangesGuard
│   ├── interceptors/ authInterceptor (Bearer, refresh ante 401, 403)
│   ├── directives/   *hasPermission
│   └── validators/   validador asíncrono de SKU
├── shared/           Componentes reutilizables: data-table, stat-card, grafico
└── pages/            Vistas: login, productos, producto-form, pedidos, dashboard, actividad, ayuda
```

Las páginas (vista) solo leen *signals* de los stores (modelo de vista); los stores llaman a los servicios API (modelo).
Los componentes de `shared/` son agnósticos: reciben datos por `input()` y avisan al padre con `output()`.

## Instalación en local

```bash
git clone https://github.com/clax-dev/DI-gestion-inventario.git
cd DI-gestion-inventario
npm install
cp .env.example .env      # y rellenar SUPABASE_URL y SUPABASE_KEY (clave publishable)
npm start                 # http://localhost:4200
```

Base de datos: ejecutar [supabase/schema.sql](supabase/schema.sql) en el SQL Editor de Supabase, crear los dos usuarios en
*Authentication → Users*, ascender al administrador con la sentencia del final del script y activar el
*Custom Access Token Hook* (`custom_access_token_hook`).

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo |
| `npm test` | Pruebas unitarias |
| `npm run build` | Compilación de producción en `www/` |
| `npm run docs` | Documentación técnica con Compodoc en `documentation/` |
| `npm run build:vercel` | Compilación + documentación (lo que ejecuta Vercel) |

## Flujo de trabajo con Git

`main` (producción, se despliega en Vercel) ← `develop` (integración) ← ramas `feature/*` mediante **Pull Request**,
cada una validada por GitHub Actions (pruebas + compilación).

---

# Manual de usuario

La aplicación también incluye este manual en la pantalla **Ayuda**, mostrando solo lo que corresponde a tu rol.

## Perfiles

| | Administrador | Usuario estándar |
|---|:-:|:-:|
| Ver catálogo de productos | ✔ | ✔ |
| Crear, editar y borrar productos | ✔ | |
| Hacer pedidos | | ✔ |
| Ver pedidos | todos | solo los suyos |
| Cambiar el estado de los pedidos | ✔ | |
| Cuadro de mando, informes PDF/CSV y actividad en tiempo real | ✔ | |

## 1. Iniciar sesión
1. Escribe tu correo y contraseña y pulsa **Entrar**.
2. El administrador entra en el **Cuadro de mando**; el usuario, en **Productos**.
3. Si intentabas abrir una página concreta, al entrar vuelves a ella.
4. Para salir: menú lateral → **Cerrar sesión**.

## 2. Navegar
- En el móvil el menú se abre con el botón ☰; en pantallas grandes está siempre visible.
- Con teclado: `Tab` / `Mayús+Tab` para moverse y `Enter` o `Espacio` para activar. El primer `Tab` muestra
  «Saltar al contenido principal».

## 3. Catálogo de productos
- El buscador filtra por cualquier columna; pulsar el título de una columna ordena la tabla.
- En el móvil cada producto se muestra como una tarjeta.
- Los productos con menos de 5 unidades se marcan con ⚠.

## 4. Hacer un pedido (usuario)
1. Pulsa **Pedir** en un producto, o ve a **Pedidos**.
2. Elige producto y cantidad; se muestra el total estimado.
3. **Confirmar pedido**: el stock se descuenta y el pedido aparece como *pendiente*.

## 5. Gestionar productos (administrador)
1. **Nuevo producto** en la cabecera de *Productos*.
2. El SKU sigue el formato `ABC-123` y no puede repetirse: se comprueba mientras escribes.
3. **Editar** / **Borrar** en cada fila. Un producto con pedidos no se puede borrar.
4. Si sales con cambios sin guardar, la app pide confirmación.

## 6. Gestionar pedidos (administrador)
- En **Pedidos** se ven los de todos los clientes; **Enviar** y **Cancelar** cambian su estado.

## 7. Cuadro de mando e informes (administrador)
- Tarjetas con el valor del inventario, productos con stock bajo, pedidos pendientes e ingresos.
- Filtra por **categoría** o pulsa una tarjeta para filtrar todo el panel; los gráficos se actualizan al instante.
- Cuando entra un pedido nuevo, el panel se actualiza solo.
- **Informes**: descarga inventario o pedidos en **PDF** o **CSV** con los filtros aplicados.

## 8. Actividad en tiempo real (administrador)
- Lista en directo de pedidos nuevos, productos creados y avisos de stock bajo, sin recargar la página.
