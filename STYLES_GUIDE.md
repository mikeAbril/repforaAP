# Guía de estilos REPFORA

Documento de referencia para que cualquier desarrollador (o agente de IA) pueda construir nuevas vistas que se vean **idénticas** al resto de la interfaz REPFORA.

> Stack: **Vue 3 + Quasar 2 + Vite**. Iconos: `material-symbols-outlined` y los nativos de Quasar (`q-icon`).

---

## 1. Paleta de colores

Definida como variables CSS globales en [style.css](style.css). Úsalas siempre con `var(--nombre)` en vez de hardcodear el hex.

```css
:root {
  --color_card: #318335;          /* Verde principal de cards */
  --color_text_card: white;       /* Texto sobre cards verdes */
  --color_button: #2e7d32;        /* Verde botones */
  --color_text_button: white;     /* Texto sobre botones */
  --color_box: #2e7d32;           /* Borde de tooltips / cajas */
  --color_button_closed: black;
  --color_header: #2e7d32;        /* Header superior */
  --color_input: #2e7d32;         /* Inputs y selects */
  --color_tooltip: #d4cece;
}
```

**Equivalencias de Quasar usadas en plantillas** (consistentes con la paleta):

| Uso             | Clase Quasar      | Color aproximado |
| --------------- | ----------------- | ---------------- |
| Verde principal | `bg-green-9`      | `#2e7d32`        |
| Verde acento    | `bg-green-10`     | `#1b5e20`        |
| Texto blanco    | `text-white`      | `#ffffff`        |
| Negativo / off  | `bg-red`          | rojo Quasar      |
| Footer / fondos | `bg-grey-4`       | gris claro       |

> **Regla de oro:** botones primarios y dialogs siempre `bg-green-9 text-white`. Badges de estado activo `bg-green-10`, inactivo `bg-red`.

---

## 2. Variables Quasar

Definidas en [src/quasar-variables.sass](src/quasar-variables.sass). No se sobreescriben por vista; respeta los defaults:

```sass
$primary   : #1976D2
$secondary : #26A69A
$accent    : #9C27B0
$dark      : #1D1D1D
$positive  : #21BA45
$negative  : #C10015
$info      : #31CCEC
$warning   : #F2C037
```

> Nota: aunque `$primary` es azul, **REPFORA usa verde** en casi toda la UI mediante las clases `bg-green-9 / bg-green-10` o las variables CSS de arriba. No uses `color="primary"` para botones de acción principal.

---

## 3. Clases utilitarias propias

Vienen de [style.css](style.css) y están disponibles globalmente.

| Clase | Para qué sirve |
| ----- | -------------- |
| `style-btn` | Aplica `--color_button` y `--color_text_button` a un botón |
| `style-text` | Fuerza `text-transform: capitalize` |
| `style-select` | Bordes y outline en color de input |
| `my-sticky-header-table` | Tabla con `height: 60vh` y header pegajoso |
| `my-sticky-header-table2` | Igual pero `height: 70vh` |
| `table-reactive` | Tabla con `height: 1000px` |
| `titleReport` | `font-size: 26px; font-weight: 600` para títulos de reportes |
| `tooltip` + `content-tooltip` | Tooltip personalizado con borde verde |
| `customEvents` | Texto con elipsis para celdas/eventos |

Scrollbar personalizado (gris redondeado) ya está aplicado globalmente vía `::-webkit-scrollbar`.

---

## 4. Estructura base de una vista

Todas las vistas internas (no Login) siguen este esqueleto:

```vue
<template>
  <div>
    <!-- 1. Botón volver -->
    <BtnBack route="/home" />

    <!-- 2. Título de sección con separador verde -->
    <HeaderLayout title="Nombre de la vista" />

    <!-- 3. Barra superior: botón Crear + filtro/buscador -->
    <div class="row justify-center">
      <div class="col-sm-2 col-md-1 col-12 justify-center flex justify-sm-start">
        <q-btn class="bg-green-9 text-white" @click="abrirDialog">
          <span class="material-symbols-outlined q-mr-sm" style="font-size: 20px">
            add_circle
          </span>
          Crear
        </q-btn>
      </div>
      <div
        class="col-sm-8 col-md-9 col-12 flex"
        :class="$q.screen.width < 600 ? 'justify-center q-mt-md' : 'justify-end'"
      >
        <q-select filled outlined dense use-input style="width: 350px" ... />
      </div>
    </div>

    <!-- 4. Tabla -->
    <div class="row q-mt-md">
      <div class="col-12 q-mb-lg">
        <q-table
          flat
          bordered
          no-data-label="Sin registros aún"
          class="q-mx-md my-sticky-header-table"
          :rows="rows"
          :columns="columns"
          row-key="index"
          rows-per-page-label="Numero de documentos"
          :rows-per-page-options="[0]"
          :pagination="{ rowsPerPage: 0 }"
        />
      </div>
    </div>

    <!-- 5. Dialog de formulario -->
    <q-dialog v-model="prompt">
      <q-card>
        <q-card-section class="bg-green-9 q-px-lg">
          <h5 class="q-mt-sm q-mb-sm text-white text-center text-weight-bold">
            DILIGENCIA LA INFORMACIÓN
          </h5>
        </q-card-section>
        <div class="q-pa-md">
          <q-form @submit.prevent.stop="guardar" novalidate>
            <!-- inputs ... -->
          </q-form>
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>
```

Componentes reutilizables que **debes importar** (no recrear):

- [src/layouts/headerViewsLayout.vue](src/layouts/headerViewsLayout.vue) → `HeaderLayout` (título de la vista + separador verde).
- [src/layouts/btnBackLayout.vue](src/layouts/btnBackLayout.vue) → `BtnBack` (botón volver).
- [src/layouts/Card.vue](src/layouts/Card.vue) → tarjeta del Home con imagen, título verde y botón VER.
- [src/layouts/headerLayout.vue](src/layouts/headerLayout.vue) y [src/layouts/drawerLayout.vue](src/layouts/drawerLayout.vue) → ya están en `App.vue`, no se repiten.
- [src/layouts/footerLayout.vue](src/layouts/footerLayout.vue) → footer global.

---

## 5. Patrones de botones

```vue
<!-- Primario (Crear / Guardar / Acciones) -->
<q-btn class="bg-green-9 text-white" label="Crear" />

<!-- Editar dentro de tabla -->
<q-btn round size="xs" color="green-10" icon="edit" />

<!-- Activar/Desactivar -->
<q-btn round size="xs" color="green-10"><span class="material-symbols-outlined" style="font-size: 18px">check</span></q-btn>
<q-btn round size="xs" color="red"><span class="material-symbols-outlined" style="font-size: 18px">close</span></q-btn>

<!-- Botón Volver / Logout -->
<q-btn flat icon="logout" size="17px" />
```

Iconos: usa `material-symbols-outlined` con `<span>` o `q-icon name="..."`. Tamaño típico `18-23px`.

---

## 6. Patrones de inputs / selects

Siempre `filled` (no `outlined`, salvo en Login). Reglas con `lazy-rules`. Prepend con icono Material Symbols.

```vue
<q-input
  filled
  type="text"
  v-model="name"
  label="Nombre"
  lazy-rules
  :rules="[(val) => (val && val.trim().length > 0) || 'El campo es requerido']"
>
  <template v-slot:prepend>
    <span class="material-symbols-outlined">person</span>
  </template>
</q-input>

<q-select
  filled
  use-input
  v-model="value"
  :options="options"
  label="Seleccione"
  :popup-content-style="{ width: '300px' }"
/>
```

Mensajes de validación estándar: `"El campo es requerido"`, `"Mínimo 10 caracteres"`, `"El campo debe ser mayor a 0"`.

---

## 7. Patrones de tabla

- Clases siempre: `flat bordered class="q-mx-md my-sticky-header-table"`.
- `no-data-label="Sin registros aún"`.
- Sin paginación visible: `:rows-per-page-options="[0]"` y `:pagination="{ rowsPerPage: 0 }"`.
- Badges para estado:

```vue
<q-badge v-if="value === 'Activo'" class="bg-green-10">{{ value }}</q-badge>
<q-badge v-else class="bg-red">{{ value }}</q-badge>
```

- Tooltips en celdas largas: `q-tooltip max-width="350px"` cuando el texto pasa cierta longitud.

---

## 8. Diálogos / Formularios modales

Cabecera siempre verde con título en mayúsculas:

```vue
<q-dialog v-model="prompt">
  <q-card>
    <q-card-section class="bg-green-9 q-px-lg">
      <h5 class="q-mt-sm q-mb-sm text-white text-center text-weight-bold">
        {{ edit ? "MODIFICA LA INFORMACIÓN" : "DILIGENCIA LA INFORMACIÓN" }}
      </h5>
    </q-card-section>
    <div class="q-pa-md">
      <q-form @submit.prevent.stop="onSubmit" novalidate>
        ...
      </q-form>
    </div>
  </q-card>
</q-dialog>
```

---

## 9. Layout / Grid responsive

Se usa el sistema de Quasar (12 columnas) con breakpoints:

```html
<div class="col-10 col-sm-6 col-md-4 col-lg-3 q-my-lg flex">
```

Patrón típico para Home/cards: 1 col en xs, 2 en sm, 3 en md, 4 en lg.

Para padding adaptativo:

```vue
:class="$q.screen.width < 500 ? 'q-px-none' : 'q-px-lg'"
```

Siempre acceder al breakpoint vía `const $q = useQuasar();`.

---

## 10. Tipografía / Títulos

- Título principal de vista: `text-h4 text-weight-bold style-text` (capitalize) — manejado por `HeaderLayout`.
- Subtítulo / sección home: `text-h5 text-weight-bold`.
- Encabezado de dialog: `<h5>` con `text-white text-center text-weight-bold`.
- Botón `VER` en cards: clase `button_style` (definida en `Card.vue`).
- Footer: `text-h6 text-weight-bold text-subtitle1`.
- Reportes: clase `titleReport`.

Familia tipográfica: la heredada de Quasar (Roboto). El Login usa además `Lucida Sans, Geneva, Verdana, sans-serif` para el título.

---

## 11. Tarjetas tipo Home

Para construir un dashboard de accesos como [src/views/Home.vue](src/views/Home.vue), reutiliza `Card`:

```vue
<Card
  title="Mi módulo"
  image="/images/mi-icono.png"
  route="/mi-ruta"
  :roles="['PROGRAMADOR', 'COORDINADOR']"
/>
```

Estructura interna ya estilizada:
- Cabecera verde (`--color_card`) con título centrado capitalizado.
- Imagen centrada (50% width, aspect ratio 4/3).
- Botón `VER` verde al pie.

---

## 12. Tooltips personalizados

Para tooltips de información (no los de Quasar), usa la estructura de `style.css`:

```html
<div class="tooltip">
  <span class="open-tooltip">?</span>
  <div class="content-tooltip">
    <div class="h-tooltip">Título</div>
    <p class="p-tooltip">Texto explicativo</p>
  </div>
</div>
```

Borde y flechita en `--color_box` (verde).

---

## 13. Checklist rápido para una vista nueva

1. [ ] Importar `BtnBack` y `HeaderLayout` (no inventar header propio).
2. [ ] Botones primarios: `class="bg-green-9 text-white"`.
3. [ ] Inputs `filled`, con `lazy-rules` y prepend icon Material Symbols.
4. [ ] Tabla con `flat bordered class="q-mx-md my-sticky-header-table"` y `no-data-label="Sin registros aún"`.
5. [ ] Dialog: cabecera `bg-green-9 q-px-lg`, título `text-white text-center text-weight-bold` en mayúsculas.
6. [ ] Badges: `bg-green-10` activo, `bg-red` inactivo.
7. [ ] Grid responsive con clases `col-12 col-sm-* col-md-* col-lg-*`.
8. [ ] Usar `var(--color_*)` en CSS scoped, nunca hex hardcodeados.
9. [ ] Roles validados con `userStore.getRole()` antes de mostrar acciones.

---

## 14. Archivos clave de referencia

| Archivo | Por qué mirarlo |
| ------- | --------------- |
| [style.css](style.css) | Variables CSS, scrollbar, tablas sticky, tooltips |
| [src/quasar-variables.sass](src/quasar-variables.sass) | Variables Sass de Quasar |
| [src/App.vue](src/App.vue) | Layout raíz (header + drawer + footer) |
| [src/layouts/Card.vue](src/layouts/Card.vue) | Tarjeta del dashboard |
| [src/layouts/headerViewsLayout.vue](src/layouts/headerViewsLayout.vue) | Título + separador verde |
| [src/layouts/headerLayout.vue](src/layouts/headerLayout.vue) | Toolbar superior |
| [src/layouts/drawerLayout.vue](src/layouts/drawerLayout.vue) | Menú lateral con items verdes |
| [src/views/Home.vue](src/views/Home.vue) | Ejemplo de dashboard de cards |
| [src/views/Instructors.vue](src/views/Instructors.vue) | Ejemplo completo: tabla + dialog + form |
| [src/views/Login.vue](src/views/Login.vue) | Ejemplo de pantalla pública con Card grande |
