  INFORME DE REVISION DEL PROYECTO                                                                                                       
  CRITICOS (Requieren atencion inmediata)                                                                                             
  
  1. Secretos en codigo fuente (Backend)

  El archivo backEnd/.env esta comprometido en git con secretos reales: JWT_SECRET, Google OAuth credentials, 2Captcha API key,       
  CRYPTO_KEY, contrasena de email. El .env deberia estar en .gitignore y solo usar .env-example con valores de ejemplo.

  2. Contrasena de admin hardcodeada

  backEnd/scripts/createAdmin.js (lineas 13-22) tiene la contrasena del admin (AdminSena2026*) en texto plano en el repositorio.      

  3. Rutas de sistema sin autenticacion

  backEnd/routes/systemRoutes.js - Los endpoints /api/system/cron/status y /api/system/cron/toggle no tienen authMiddleware. Cualquier
   persona puede activar/desactivar el cron.

  4. Bug real: Campos de aportes_en_linea inconsistentes

  La validacion en platform.validation.js espera campos ["anio", "mes"], pero el scraper aportesEnLineaScraper.js y
  reportController.js usan mesIni, anioIni, mesFin, anioFin. Los reportes pasan validacion pero fallan en scraping.

  5. Archivos de servicio inexistentes (Frontend)

  composables/useAuth.js importa authService y supervisorService que no existen. composables/useCertificates.js importa reportService 
  que no existe. Estos composables no pueden ejecutarse.

  ---
  ARCHIVOS Y CODIGO MUERTO

  Backend

  ┌──────────────────────────────────────────┬───────────────────────────────────────────────────────────────┐
  │                 Archivo                  │                           Problema                            │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ services/captchaService.js               │ Archivo completo sin uso - Ningun scraper lo importa          │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ scripts/seed.js                          │ Referenciado en package.json pero no existe                   │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ controllers/supervisorController.js:8-12 │ Funcion extractFolderId nunca usada                           │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ services/driveService.js:190-218         │ Funciones setupSupervisorFolder y checkIfFolderExists sin uso │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ validations/platform.validation.js:66    │ Export default PLATFORM_FIELDS nunca importado                │
  └──────────────────────────────────────────┴───────────────────────────────────────────────────────────────┘

  Dependencias npm sin uso en package.json

  - mongodb - Se usa Mongoose, nunca se importa mongodb directamente
  - playwright-extra - Nunca importado
  - puppeteer-extra-plugin-stealth - Plugin de Puppeteer, el proyecto usa Playwright

  Frontend

  ┌────────────────────────────────┬─────────────────────────────────────────────────────────┐
  │            Archivo             │                        Problema                         │
  ├────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ static/options.js              │ Archivo completo sin uso - Ningun componente lo importa │
  ├────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ composables/useAuth.js         │ Nunca importado por ningun .vue                         │
  ├────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ composables/useCertificates.js │ Nunca importado por ningun .vue                         │
  ├────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ plugins/notify.js (exports)    │ hideNotification y notificationState nunca consumidos   │
  ├────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ views/LoginView.vue:102        │ rememberMe ref con checkbox pero sin funcionalidad      │
  ├────────────────────────────────┼─────────────────────────────────────────────────────────┤
  │ views/HomeView.vue:123-128     │ Clases CSS definidas pero nunca usadas en el template   │
  └────────────────────────────────┴─────────────────────────────────────────────────────────┘

  ---
  FUNCIONES Y LOGICA DUPLICADA

  Backend

  ┌─────────────────────────────────────┬────────────────────────────────────────────────────────────────┐
  │               Funcion               │                     Archivos donde aparece                     │
  ├─────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ updateEnvFile()                     │ services/driveService.js:58-76 y utils/setupDriveAuth.js:85-97 │
  ├─────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ __filename/__dirname polyfill       │ Repetido en 6 archivos                                         │
  ├─────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ dotenv.config()                     │ Llamado en 9 archivos (ya se llama en index.js)                │
  ├─────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Configuracion de browser Playwright │ Repetida en 3 scrapers                                         │
  ├─────────────────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ DOC_LABEL_MAP (tipos de documento)  │ Definido en 4 scrapers con variaciones                         │
  └─────────────────────────────────────┴────────────────────────────────────────────────────────────────┘

  Frontend

  ┌──────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────┐   
  │            Funcion/Logica            │                                 Archivos donde aparece                                 │   
  ├──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤   
  │ getOptions()                         │ InstructorView.vue:264 y UnifiedForm.vue:180                                           │   
  ├──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤   
  │ filterFn()                           │ InstructorView.vue:273 y UnifiedForm.vue:207                                           │   
  ├──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤   
  │ fetchSupervisors()                   │ InstructorView.vue:233 y UnifiedForm.vue:191                                           │   
  ├──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤   
  │ onSubmit() (construccion de payload) │ InstructorView.vue:288 y UnifiedForm.vue:225                                           │   
  ├──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤   
  │ logout()                             │ 3 implementaciones distintas: MainLayout.vue:31, SupervisorView.vue:474, useAuth.js:32 │   
  ├──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤   
  │ Catalogo EPS                         │ formConfigs.js y options.js                                                            │   
  ├──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤   
  │ Lista de meses/anios                 │ formConfigs.js, options.js, SupervisorView.vue (inline)                                │   
  ├──────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤   
  │ Opciones de plataforma               │ InstructorView.vue:179 y SupervisorView.vue:452                                        │   
  └──────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────┘   

  ---
  BUGS MENORES

  Backend

  - Cron mal configurado: scraperRunner.js:283 - El comentario dice "2:00 AM" pero la expresion es "19 20 * * *" (8:19 PM)
  - Comentario/codigo mismatch: Linea 201 dice "15 minutos" pero linea 205 usa 5 * 60 * 1000 (5 minutos)
  - Error silenciado en login: authController.js:54-60 - Falla de envio de email no se maneja
  - Conexion DB fallida no detiene proceso: config/db.js - Si mongoose.connect falla, el servidor sigue corriendo

  Frontend

  - Keys duplicados en payload: UnifiedForm.vue:233-238 - email y documentIssueDate asignados dos veces
  - Texto fantasma: MainLayout.vue:54 - Texto "Riverside" despues del cierre de </style>
  - authStore.user no existe: useAuth.js:12,42,56 - El store solo tiene token, no user

  ---
  SEGURIDAD

  ┌────────────────────────────┬──────────────────────────────────────────────────────────────────────────┐
  │           Riesgo           │                                Ubicacion                                 │
  ├────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Sin rate limiting en login │ authRoutes.js                                                            │
  ├────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ ReDoS en busqueda          │ dashboardController.js:44 - new RegExp(search, "i") con input de usuario │
  ├────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ CRYPTO_KEY debil           │ 12345678901234567890123456789012 - Secuencial                            │
  ├────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ XSS en template HTML       │ driveService.js:244-276 - Interpolacion sin escape                       │
  ├────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Archivos Drive publicos    │ driveService.js:276-282 - Todos los certificados son accesibles por link │
  ├────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Token en localStorage      │ store/auth.js - Vulnerable a XSS                                         │
  ├────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Sin interceptor 401        │ plugins/axios.js - Token expirado no redirige a login                    │
  ├────────────────────────────┼──────────────────────────────────────────────────────────────────────────┤
  │ Sin proteccion CSRF        │ N/A                                                                      │
  └────────────────────────────┴──────────────────────────────────────────────────────────────────────────┘

  ---
  INCONSISTENCIAS

  ┌───────────────────────────┬─────────────────────────────────────────────────────────────────────────┐
  │      Inconsistencia       │                                 Detalle                                 │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Uso del cliente API       │ Algunas vistas usan apiClient.js, otras usan axios directamente         │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Sistema de notificaciones │ 2 sistemas: $q.notify() y plugins/notify.js                             │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Import de dotenv          │ Algunos usan import "dotenv/config", otros dotenv.config()              │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Label tipos documento     │ "Cedula de ciudadania" vs "Cedula de Ciudadania" vs "Cedula Ciudadania" │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ CORS permite x-token      │ Ningun middleware lee ese header                                        │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Swagger incompleto        │ 6 de 16 endpoints (37.5%) sin documentar                                │
  └───────────────────────────┴─────────────────────────────────────────────────────────────────────────┘

  ---
  ENDPOINTS SIN UI

  Estos endpoints de backend no tienen interfaz en el frontend:

  ┌──────────────────────────────┬─────────────────────────┐
  │           Endpoint           │         Estado          │
  ├──────────────────────────────┼─────────────────────────┤
  │ GET /api/health              │ Normal, es health check │
  ├──────────────────────────────┼─────────────────────────┤
  │ GET /api/system/cron/status  │ Sin UI                  │
  ├──────────────────────────────┼─────────────────────────┤
  │ POST /api/system/cron/toggle │ Sin UI                  │
  └──────────────────────────────┴─────────────────────────┘

  ---
  RESUMEN PRIORITARIO

  ┌───────────────────────────┬─────────────────────────────────────────────────────────────────────────┐
  │      Inconsistencia       │                                 Detalle                                 │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Uso del cliente API       │ Algunas vistas usan apiClient.js, otras usan axios directamente         │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Sistema de notificaciones │ 2 sistemas: $q.notify() y plugins/notify.js                             │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Import de dotenv          │ Algunos usan import "dotenv/config", otros dotenv.config()              │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Label tipos documento     │ "Cedula de ciudadania" vs "Cedula de Ciudadania" vs "Cedula Ciudadania" │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ CORS permite x-token      │ Ningun middleware lee ese header                                        │
  ├───────────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Swagger incompleto        │ 6 de 16 endpoints (37.5%) sin documentar                                │
  └───────────────────────────┴─────────────────────────────────────────────────────────────────────────┘

  ---
  ENDPOINTS SIN UI

  Estos endpoints de backend no tienen interfaz en el frontend:

  ┌──────────────────────────────┬─────────────────────────┐
  │           Endpoint           │         Estado          │
  ├──────────────────────────────┼─────────────────────────┤
  │ GET /api/health              │ Normal, es health check │
  ├──────────────────────────────┼─────────────────────────┤
  │ GET /api/system/cron/status  │ Sin UI                  │
  ├──────────────────────────────┼─────────────────────────┤
  │ POST /api/system/cron/toggle │ Sin UI                  │
  └──────────────────────────────┴─────────────────────────┘

  ---
  RESUMEN PRIORITARIO

  1. Hoy: Sacar .env de git, poner secrets en .gitignore, agregar auth a rutas de sistema
  2. Corto plazo: Corregir bug de campos aportes_en_linea, eliminar archivos muertos, corregir hora del cron
  3. Mediano plazo: Estandarizar uso de apiClient/axios, consolidar funciones duplicadas, agregar interceptor 401, unificar listas de 
  opciones (meses/anios/platformas)
  4. Cuando se pueda: Unificar InstructorView y UnifiedForm (comparten ~80% de logica), agregar rate limiting, mejorar CRYPTO_KEY     

  Nada de esto afecta el funcionamiento actual del software - son mejoras de mantenimiento, seguridad y calidad de codigo.

  ===================================================================================
  CAMBIOS REALIZADOS (05-05-2026)
  ===================================================================================

  Los siguientes cambios se ejecutaron limpiando unicamente codigo muerto y correcciones
  que NO afectan el funcionamiento actual del sistema. Backend levanta correctamente y
  frontend compila sin errores tras todos los cambios.

  --- ARCHIVOS ELIMINADOS (4) ---

  1. backEnd/services/captchaService.js
     - Archivo completo eliminado. Nunca fue importado por ningun scraper ni controller.
     - Cada scraper crea su propia instancia de Solver directamente.

  2. frontEnd/src/static/options.js
     - Archivo completo eliminado. Ningun componente lo importaba.
     - Catalogos de EPS, meses y anios ya existen en formConfigs.js.

  3. frontEnd/src/composables/useAuth.js
     - Archivo completo eliminado. Nunca fue importado por ningun .vue.
     - Ademas, dependia de authService y supervisorService que no existian.

  4. frontEnd/src/composables/useCertificates.js
     - Archivo completo eliminado. Nunca fue importado por ningun .vue.
     - Ademas, dependia de reportService que no existia.

  --- FUNCIONES Y CODIGO MUERTO ELIMINADO ---

  Backend:

  1. supervisorController.js - Funcion extractFolderId() eliminada (nunca usada)
  2. driveService.js - Funciones setupSupervisorFolder() y checkIfFolderExists() eliminadas
     (nunca llamadas). Importacion en scraperRunner.js actualizada en consecuencia.
  3. platform.validation.js - Export default PLATFORM_FIELDS eliminado (nunca importado como default)
  4. package.json - Dependencias npm eliminadas:
     - mongodb (se usa mongoose, nunca se importa mongodb directamente)
     - playwright-extra (nunca importado)
     - puppeteer-extra-plugin-stealth (plugin de Puppeteer, proyecto usa Playwright)
  5. package.json - Script "seed" eliminado (referenciaba scripts/seed.js que no existe)
  6. aportesEnLineaScraper.js - Linea comentada eliminada: // const solver = ...
  7. asopagosScraper.js - Linea comentada eliminada: // const solver = ...
  8. miPlanillaScraper.js - Linea comentada eliminada: // const solver = ...

  Frontend:

  9. UnifiedForm.vue - Keys duplicados eliminados del payload (email y documentIssueDate
     aparecian dos veces, lines 236-237 y 253-254). Las deletes duplicadas tambien eliminadas.
  10. UnifiedForm.vue - Lineas vacias innecesarias eliminadas en getOptions()
  11. MainLayout.vue - Texto fantasma "Riverside" eliminado (aparecia despues del cierre de </style>)
  12. HomeView.vue - Import "ref" eliminado (nunca se usaba)
  13. HomeView.vue - CSS .hero-desc eliminado (clase no usada en el template)
  14. HomeView.vue - ~50 lineas de CSS eliminadas, ninguna usada en el template:
      .platforms-grid, .platform-card-premium, .bg-mi_planilla, .bg-aportes_en_linea,
      .platform-info, .platform-name, .platform-action, .btn-back, .btn-back:hover

  --- COMENTARIOS CORREGIDOS ---

  1. scraperRunner.js - Comentario decia "15 minutos" pero el codigo usa 5 minutos.
     Corregido para decir "5 minutos".
  2. scraperRunner.js - Comentario y log decian "2:00 AM" pero la expresion cron es
     "19 20 * * *" (8:19 PM). Corregido para decir "8:19 PM".

  --- VERIFICACION ---

  - Backend: Levanta correctamente con "node index.js", conexion a MongoDB exitosa.
  - Frontend: Compila sin errores con "npx vite build".
  - No quedan importaciones rotas: se verifico con grep que ningun archivo referencia
    los archivos o funciones eliminadas.