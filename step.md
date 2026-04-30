# Repfora — Estado del Proyecto y Plan de Acción (step.md)

Este documento detalla el progreso actual del proyecto según los nuevos requerimientos y lo que queda pendiente por implementar paso a paso.

## ✅ Lo que ya está completado

1. **Modelos de Base de Datos (Actualizados):**
   - `models/Supervisor.js`: Se ha agregado el campo `apiKey` para alojar la clave de 2Captcha por usuario.
   - `models/Instructor.js`: La entidad `Contractor` migró a `Instructor`, incorporando campos clave como `documentIssueDate` y la referencia al `supervisorId`. **Se eliminó el campo `eps` ya que este dato ahora es variable por reporte.**
   - `models/Report.js`: Actualizado para referenciar correctamente a `Instructor` (`instructorId`) en lugar de `contractorId`, e incluyó campos obligatorios de mes y año (`reportMonth`, `reportYear`) y **el campo `eps` (movido desde el Instructor).**

---

## 🚧 Lo que falta por hacer (To-Do)

### 1. Seguridad y Cifrado de la API Key

- [x] **Crear `backEnd/utils/crypto.js`**: Implementar la utilidad de cifrado/descifrado (AES-256).
- [x] **Ajustar el Modelo `Supervisor`**: Guardar la `apiKey` encriptada (el IV se guarda junto al texto usando formato `iv:encrypted`).
- [x] **Ajustar `supervisorController.js`**: Implementar el cifrado del `apiKey` cuando se crea o edita desde el panel admin.
- [x] **Ajustar `scraperRunner.js`**: Recuperar el `apiKey` del supervisor según el reporte, descifrarlo usando `crypto.js` y enviarlo a los scrapers.

### 2. Flujo de Onboarding y Autenticación

- [x] **Contraseña por defecto**: Al crear un supervisor desde el panel de admin, la contraseña inicial es igual al `documentNumber`.
- [ ] **Forzar cambio de contraseña**: Agregar un flag (ej. `mustChangePassword`) en `Supervisor`. Al iniciar sesión, retornar un estado que obligue al frontend a mostrar la pantalla de cambio de clave. *(Backend listo, falta Frontend)*
- [ ] **Obligar ingreso de API Key**: Validar y forzar que el supervisor ingrese su clave de 2Captcha en el mismo modal de primer login si no la tiene configurada. *(Backend listo, falta Frontend)*

### 3. Validaciones de la API Key en el Backend

- [ ] **Endpoint de Validación**: Antes de guardar el `apiKey` introducido por el usuario, el backend debe realizar una petición GET a la API de balance de 2Captcha para asegurar que la llave es válida y tiene saldo.

### 4. Accesos Públicos de Google Drive

- [x] **Ajustar `driveService.js`**: Tras la subida del PDF, consumir la API de Drive para manipular los permisos del archivo subido haciéndolo público.

### 5. Interfaz de Tabla de Certificados (Frontend Vue)

- [ ] **Nuevos Filtros**: Modificar el componente de datos para incluir filtros por **Mes**, **Año** y **Plataforma**.
- [ ] **Botón Screenshot**: Añadir una funcionalidad para hacer captura de la tabla filtrada (usando bibliotecas como `html2canvas`).
- [ ] **Columna "Resolución"**: Indicar si el certificado fue obtenido de manera "Automática" o "Manual".

### 6. Modo Manual (Bypass del Scraper)

- [ ] **Ajustar el Botón de Acción**: En caso de fallo o ausencia de saldo/clave en 2Captcha, el supervisor puede accionar un botón "Resolver Manual".
- [ ] **Trigger Headless**: Modificar el endpoint del runner o scraper en el backend para poder aceptar un flag `manual: true`.

### 7. Validaciones Finales en Reportes

- [ ] **Integridad de Estado**: Agregar lógica en las validaciones u on-save hooks de Mongoose para impedir que un reporte pase a estado "Completado".

### 8. Implementación de Notificaciones (Nodemailer)

- [x] **Crear `backEnd/utils/nodemailer.js`**: Implementar un utilitario centralizado para el envío de correos.
- [x] **Función Universal de Envío**: Diseñada con diseño premium institucional (colores SENA, sombreados, nota de confidencialidad).
- [x] **Configuración por Variables de Entorno**: Transportador preconfigurado desde el `.env`.

### 9. Gestión de Administradores (Nuevo)

- [x] **Roles**: Implementación de roles `admin` y `supervisor` en el modelo y tokens JWT.
- [x] **Panel Frontend**: Creación de `AdminSupervisorsView.vue` para CRUD completo de usuarios.
- [x] **Seguridad Backend**: Middlewares de autenticación y rol protegiendo las rutas `/api/supervisors/admin`.

---

## 🔄 Cambios Recientes (Frontend)

### 1. Flujo simplificado: Landing Page + Modal
Se eliminó la pantalla de selección de rol (supervisor/contratista) y se unificó en una sola vista:
- **`CardTest.vue`**: Pantalla de inicio con una única tarjeta "Planillas" y un botón "VER".
- **`FormModal.vue`**: Al presionar "VER" se abre un modal con el formulario de solicitud de certificado, donde el usuario selecciona la plataforma (SOI, ASOPAGOS, COMPENSAR, APORTES EN LINEA) y completa los campos dinámicos correspondientes.

### 2. Corrección de `v-model` en props (Vue 3)
En `FormModal.vue` se corrigió el error `v-model cannot be used on a prop`:
```vue
<!-- Antes (error) -->
<q-dialog v-model="modelValue">
<!-- Después (correcto) -->
<q-dialog :model-value="modelValue" @update:model-value="val => { if (!val) closeModal() }">
```

### 3. Rediseño de la tarjeta de inicio
La tarjeta en `CardTest.vue` fue rediseñada siguiendo el estilo de `ejemplo.png`:
- Barra de encabezado verde con título "Planillas".
- Área de contenido blanco con la ilustración `card.png` centrada.
- Botón "VER" verde con degradado en la parte inferior.
- Bordes redondeados y sombra sutil con efecto hover.

### 4. Ajustes del modal (`FormModal.vue`)
- Ancho: **60vw** | Alto: **97vh**
- Barra superior mejorada: logo SENA + título + subtítulo + botón cerrar con mejor espaciado.

### 5. Rutas (`routes.js`)
- `/` → `CardTest.vue` (página principal)
- `/login` → `LoginView.vue`
- `/supervisor` → `SupervisorView.vue` (requiere autenticación)

---

> **Nota para el desarrollador:** He revisado tu código y aunque comentaste tener listo `crypto.js` y modificado el `supervisorController.js` y `captchaService.js`, esos cambios **aún no están reflejados ni guardados en los archivos del proyecto** (están tal cual estaban originalmente o no existen). Te sugiero que guardes/sincronices los cambios, o bien, si deseas que yo genere el código para `crypto.js` y las adecuaciones a los servicios, házmelo saber para empezar a escribirlo.
