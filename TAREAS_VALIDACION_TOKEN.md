Ir aplicándolo a todos los proyecto indicados en las tareas

# Tareas Frontend: Sistema de Gestión de Tokens

  

## Descripción General

  

Este documento describe las tareas necesarias para integrar el nuevo sistema de gestión de tokens en los proyectos frontend. Se dividen en dos tipologías:

  

1. **Proyectos con Login Obligatorio**: `middle`, `middle-atc`, `touroperacion`

2. **Proyecto Web Pública/Privada**: `ui`

  

---

  

## Tipología 1: Proyectos con Login Obligatorio

  

### Proyectos Afectados

- `core.differentroads.middle`

- `core.differentroads.middle-atc`

- `core.differentroads.touroperacion`

  

### Características Actuales

- Usan `amazon-cognito-identity-js` directamente

- Tienen `AuthGuard` que verifica autenticación y permisos específicos

- Todas las rutas (excepto `/login`) requieren autenticación

- Verifican permisos específicos (`hasMiddleAccess`, `hasMiddleAtcAccess`, `hasTourOperationAccess`)

  

---

  

## Fase 1: Configuración y Servicios Base

  

### ✅ Tarea 1.1: Crear servicio de API de autenticación

- [ ] Crear `auth-api.service.ts` en `core/services/`

- [ ] Implementar métodos para llamar a los endpoints del backend:

- `generateInternalToken(cognitoToken: string)`

- `validateInternalToken(token: string)`

- [ ] Configurar URL base del API de autenticación desde `environment`

- [ ] Manejar errores HTTP (401, 404, etc.)

- [ ] **Nota**: El endpoint `verifyCognitoToken` es solo para depuración en el backend, no se usa desde el frontend

  

**Archivos a crear:**

- `src/app/core/services/auth-api.service.ts`

  

**Archivos a modificar:**

- `src/environments/environment.ts`

- `src/environments/environment.prod.ts`

  

---

  

### ✅ Tarea 1.2: Crear servicio de gestión de tokens

- [ ] Crear `token-manager.service.ts` en `core/services/`

- [ ] Implementar almacenamiento del token JWT propio:

- Guardar en `localStorage` (consistente con AWS Cognito que también usa `localStorage`)

- Clave: `internalAuthToken`

- [ ] Implementar métodos:

- `getInternalToken(): string | null`

- `setInternalToken(token: string): void`

- `clearInternalToken(): void`

- `hasInternalToken(): boolean`

- `isTokenExpired(): boolean` (verificar expiración local del JWT sin llamar al backend)

  

**Archivos a crear:**

- `src/app/core/services/token-manager.service.ts`

  

---

  

### ✅ Tarea 1.3: Actualizar configuración de environment

- [ ] Añadir `authApiUrl` a los archivos de environment

- [ ] Documentar las nuevas configuraciones

  

**Archivos a modificar:**

- `src/environments/environment.ts`

- `src/environments/environment.prod.ts`

  

---

  

## Fase 2: Actualizar Servicio de Autenticación

  

### ✅ Tarea 2.1: Modificar `auth-service.service.ts`

- [ ] Inyectar `AuthApiService` y `TokenManagerService`

- [ ] Modificar método `login()`:

1. Mantener login con Cognito (actual)

2. Obtener `idToken` de la sesión de Cognito

3. Llamar a `authApiService.generateInternalToken(idToken)`

4. Guardar el token JWT propio con `tokenManagerService.setInternalToken()`

5. Actualizar BehaviorSubjects con información del usuario del token

- [ ] Modificar método `checkAuthStatus()`:

1. Verificar si hay token JWT propio almacenado

2. Si existe, validarlo con `authApiService.validateInternalToken()`

3. Si es válido, actualizar estado de autenticación

4. Si no es válido o no existe, verificar Cognito (fallback)

- [ ] Añadir método `refreshInternalToken()`:

- Obtener `idToken` actual de Cognito

- Generar nuevo token JWT propio

- Actualizar almacenamiento

  

**Archivos a modificar:**

- `src/app/core/services/auth-service.service.ts`

  

---

  

### ✅ Tarea 2.2: Implementar renovación on-demand de token

- [ ] Crear método `refreshInternalTokenIfNeeded()` en `auth-service.service.ts`

- [ ] Verificar expiración local del token antes de usar

- [ ] Si el token está próximo a expirar (por ejemplo, 5 minutos antes):

- Obtener `idToken` actual de Cognito

- Llamar a `authApiService.generateInternalToken(idToken)`

- Actualizar token almacenado

- [ ] Llamar a este método cuando sea necesario (antes de peticiones importantes, en el guard, etc.)

- [ ] **Nota**: No se valida el token con el backend desde el frontend. La validación se hace automáticamente cuando el token se envía en las peticiones HTTP.

  

**Archivos a modificar:**

- `src/app/core/services/auth-service.service.ts`

  

---

  

## Fase 3: Interceptor HTTP

  

### ✅ Tarea 3.1: Crear interceptor HTTP para tokens

- [ ] Crear `auth-token.interceptor.ts` en `core/interceptors/`

- [ ] Implementar `HttpInterceptor`:

- Interceptar todas las peticiones HTTP

- Añadir header `Authorization: Bearer {internalToken}` a las peticiones

- Si no hay token, no añadir header (para rutas públicas si las hay)

- [ ] Manejar errores 401:

- Si el backend devuelve 401, el token es inválido o expirado

- Intentar renovar token obteniendo nuevo `idToken` de Cognito

- Si falla la renovación, redirigir a login

- [ ] Registrar interceptor en `app.module.ts`

  

**Archivos a crear:**

- `src/app/core/interceptors/auth-token.interceptor.ts`

  

**Archivos a modificar:**

- `src/app/app.module.ts`

  

---

  

## Fase 4: Actualizar AuthGuard

  

### ✅ Tarea 4.1: Modificar `auth.guard.ts` para cada proyecto

- [ ] Actualizar lógica de `canActivate()`:

1. Verificar si hay token JWT propio almacenado

2. Si no hay token, verificar Cognito (fallback)

3. Si hay token, verificar expiración local (sin llamar al backend)

4. Si el token existe y no está expirado localmente, verificar permisos específicos del proyecto:

- `middle`: `hasMiddleAccess`

- `middle-atc`: `hasMiddleAtcAccess`

- `touroperacion`: `hasTourOperationAccess`

5. Si todo es válido, permitir acceso

6. Si no, redirigir a login

7. **Nota**: La validación real del token se hace en el backend cuando se envía en las peticiones HTTP. Si el token es inválido, el backend devolverá 401 y el interceptor manejará el error.

  

**Archivos a modificar:**

- `src/app/shared/auth.guard.ts` (en cada proyecto)

  

---

  

## Fase 5: Actualizar Componente de Login

  

### ✅ Tarea 5.1: Modificar componente de login

- [ ] Después de login exitoso con Cognito:

1. Llamar a `authApiService.generateInternalToken()`

2. Guardar token con `tokenManagerService`

3. Redirigir según permisos del usuario

- [ ] Manejar errores:

- Si el usuario no existe en el sistema, mostrar mensaje apropiado

- Si el token de Cognito es inválido, mostrar error de autenticación

  

**Archivos a modificar:**

- `src/app/pages/login/login.component.ts` (en cada proyecto)

  

---

  

## Fase 6: Actualizar Logout

  

### ✅ Tarea 6.1: Modificar método de logout

- [ ] Limpiar token JWT propio con `tokenManagerService.clearInternalToken()`

- [ ] Mantener logout de Cognito (actual)

- [ ] Redirigir a login

  

**Archivos a modificar:**

- `src/app/core/services/auth-service.service.ts`

  

---

  

## Fase 7: Testing

  

### ✅ Tarea 7.1: Probar flujo completo

- [ ] Probar login exitoso y generación de token

- [ ] Probar renovación on-demand de token cuando está próximo a expirar

- [ ] Probar logout y limpieza de tokens

- [ ] Probar acceso a rutas protegidas con token válido

- [ ] Probar acceso denegado con token expirado localmente

- [ ] Probar interceptor HTTP añadiendo token a peticiones

- [ ] Probar manejo de errores 401 del backend (token inválido)

  

---

  

---

  

## Tipología 2: Proyecto Web Pública/Privada

  

### Proyecto Afectado

- `core.differentroads.ui`

  

### Características Actuales

- Usa AWS Amplify para autenticación

- Tiene rutas públicas (home, tours, etc.) y privadas (profile, bookings, checkout)

- Usa `AuthenticateService` con `amazon-cognito-identity-js` y AWS SDK

  

---

  

## Fase 1: Configuración y Servicios Base

  

### ✅ Tarea 1.1: Crear servicio de API de autenticación

- [ ] Crear `auth-api.service.ts` en `core/services/auth/`

- [ ] Implementar métodos para llamar a los endpoints del backend:

- `generateInternalToken(cognitoToken: string)`

- `validateInternalToken(token: string)`

- [ ] Configurar URL base del API de autenticación desde `environment`

- [ ] Manejar errores HTTP (401, 404, etc.)

- [ ] **Nota**: El endpoint `verifyCognitoToken` es solo para depuración en el backend, no se usa desde el frontend

  

**Archivos a crear:**

- `src/app/core/services/auth/auth-api.service.ts`

  

**Archivos a modificar:**

- `src/environments/environment.ts`

- `src/environments/environment.prod.ts`

  

---

  

### ✅ Tarea 1.2: Crear servicio de gestión de tokens

- [ ] Crear `token-manager.service.ts` en `core/services/auth/`

- [ ] Implementar almacenamiento del token JWT propio:

- Guardar en `localStorage` (consistente con AWS Cognito que también usa `localStorage`)

- Clave: `internalAuthToken`

- [ ] Implementar métodos:

- `getInternalToken(): string | null`

- `setInternalToken(token: string): void`

- `clearInternalToken(): void`

- `hasInternalToken(): boolean`

- `isTokenExpired(): boolean` (verificar expiración local del JWT sin llamar al backend)

  

**Archivos a crear:**

- `src/app/core/services/auth/token-manager.service.ts`

  

---

  

### ✅ Tarea 1.3: Actualizar configuración de environment

- [ ] Añadir `authApiUrl` a los archivos de environment

- [ ] Documentar las nuevas configuraciones

  

**Archivos a modificar:**

- `src/environments/environment.ts`

- `src/environments/environment.prod.ts`

  

---

  

## Fase 2: Actualizar Servicio de Autenticación

  

### ✅ Tarea 2.1: Modificar `auth-service.service.ts`

- [ ] Inyectar `AuthApiService` y `TokenManagerService`

- [ ] Modificar método `login()`:

1. Mantener login con Cognito/AWS SDK (actual)

2. Obtener `idToken` de la respuesta de Cognito

3. Llamar a `authApiService.generateInternalToken(idToken)`

4. Guardar el token JWT propio con `tokenManagerService.setInternalToken()`

5. Actualizar BehaviorSubjects con información del usuario del token

- [ ] Modificar método `checkAuthStatus()`:

1. Verificar si hay token JWT propio almacenado

2. Si existe, verificar expiración local del token (sin llamar al backend)

3. Si no está expirado localmente, actualizar estado de autenticación

4. Si está expirado o no existe, verificar Cognito (fallback)

5. **Nota**: La validación real del token se hace en el backend cuando se envía en las peticiones HTTP

- [ ] Añadir método `refreshInternalToken()`:

- Obtener `idToken` actual de Cognito

- Generar nuevo token JWT propio

- Actualizar almacenamiento

  

**Archivos a modificar:**

- `src/app/core/services/auth/auth-service.service.ts`

  

---

  

### ✅ Tarea 2.2: Implementar renovación on-demand de token

- [ ] Crear método `refreshInternalTokenIfNeeded()` en `auth-service.service.ts`

- [ ] Verificar expiración local del token antes de usar

- [ ] Si el token está próximo a expirar (por ejemplo, 5 minutos antes):

- Obtener `idToken` actual de Cognito

- Llamar a `authApiService.generateInternalToken(idToken)`

- Actualizar token almacenado

- [ ] Llamar a este método cuando sea necesario (antes de peticiones importantes, en el guard, etc.)

- [ ] **Nota**: No se valida el token con el backend desde el frontend. La validación se hace automáticamente cuando el token se envía en las peticiones HTTP.

  

**Archivos a modificar:**

- `src/app/core/services/auth/auth-service.service.ts`

  

---

  

## Fase 3: Interceptor HTTP

  

### ✅ Tarea 3.1: Crear interceptor HTTP para tokens

- [ ] Crear `auth-token.interceptor.ts` en `core/interceptors/`

- [ ] Implementar `HttpInterceptor`:

- Interceptar todas las peticiones HTTP

- Si existe token JWT propio, añadir header `Authorization: Bearer {internalToken}` a TODAS las peticiones

- Si no hay token, no añadir header

- **Nota**: El token se añade siempre que exista, independientemente de si la ruta es pública o privada

- [ ] Manejar errores 401:

- Si el backend devuelve 401, el token es inválido o expirado

- Intentar renovar token obteniendo nuevo `idToken` de Cognito

- Si falla la renovación, redirigir a login

- [ ] Registrar interceptor en `app.module.ts`

  

**Archivos a crear:**

- `src/app/core/interceptors/auth-token.interceptor.ts`

  

**Archivos a modificar:**

- `src/app/app.module.ts`

  

---

  

## Fase 4: Crear/Actualizar AuthGuard

  

### ✅ Tarea 4.1: Crear o actualizar `auth.guard.ts`

- [ ] Verificar si existe `auth.guard.ts`

- [ ] Si no existe, crearlo

- [ ] Implementar lógica de `canActivate()`:

1. Verificar si hay token JWT propio almacenado

2. Si no hay token, verificar Cognito (fallback)

3. Si hay token, verificar expiración local (sin llamar al backend)

4. Si el token existe y no está expirado localmente, permitir acceso

5. Si no, redirigir a login (guardando URL de destino)

6. **Nota**: La validación real del token se hace en el backend cuando se envía en las peticiones HTTP. Si el token es inválido, el backend devolverá 401 y el interceptor manejará el error.

- [ ] Aplicar guard a las siguientes rutas privadas en `app-routing.module.ts`:

- `/profile`

- `/reservation/:reservationId/:paymentId`

- `/reservation/:reservationId`

- `/reservation-view/:reservationId/:paymentId`

- `/reservation-view/:reservationId`

- `/bookings/:id`

  

**Archivos a crear/modificar:**

- `src/app/shared/auth.guard.ts`

- `src/app/app-routing.module.ts`

  

---

  

## Fase 5: Actualizar Componente de Login

  

### ✅ Tarea 5.1: Modificar componente de login

- [ ] Después de login exitoso con Cognito:

1. Llamar a `authApiService.generateInternalToken()`

2. Guardar token con `tokenManagerService`

3. Redirigir a URL guardada o a página por defecto

- [ ] Manejar errores:

- Si el usuario no existe en el sistema, mostrar mensaje apropiado

- Si el token de Cognito es inválido, mostrar error de autenticación

  

**Archivos a modificar:**

- `src/app/pages/login/login.component.ts`

  

---

  

## Fase 6: Actualizar Logout

  

### ✅ Tarea 6.1: Modificar método de logout

- [ ] Limpiar token JWT propio con `tokenManagerService.clearInternalToken()`

- [ ] Mantener logout de Cognito (actual)

- [ ] Redirigir a home (ruta pública)

  

**Archivos a modificar:**

- `src/app/core/services/auth/auth-service.service.ts`

  

---

  

## Fase 7: Configurar Rutas Protegidas

  

### ✅ Tarea 7.1: Aplicar AuthGuard a rutas privadas

- [ ] En `app-routing.module.ts`, añadir `canActivate: [AuthGuard]` a las siguientes rutas:

- `{ path: 'profile', component: ProfileV2Component, canActivate: [AuthGuard] }`

- `{ path: 'reservation/:reservationId/:paymentId', component: ReservationInfoComponent, canActivate: [AuthGuard] }`

- `{ path: 'reservation/:reservationId', component: ReservationInfoComponent, canActivate: [AuthGuard] }`

- `{ path: 'reservation-view/:reservationId/:paymentId', component: NewReservationComponent, canActivate: [AuthGuard] }`

- `{ path: 'reservation-view/:reservationId', component: NewReservationComponent, canActivate: [AuthGuard] }`

- `{ path: 'bookings/:id', component: Bookingsv2Component, canActivate: [AuthGuard] }`

- [ ] **Nota**: El interceptor HTTP añade el token a todas las peticiones si existe, pero el guard solo protege estas rutas específicas

  

**Archivos a modificar:**

- `src/app/app-routing.module.ts`

  

---

  

## Fase 8: Testing

  

### ✅ Tarea 8.1: Probar flujo completo

- [ ] Probar login exitoso y generación de token

- [ ] Probar acceso a rutas públicas sin token (debe funcionar)

- [ ] Probar acceso a rutas protegidas con token válido:

- `/profile`

- `/reservation/:reservationId`

- `/reservation-view/:reservationId`

- `/bookings/:id`

- [ ] Probar acceso denegado a rutas protegidas sin token (debe redirigir a login)

- [ ] Probar renovación on-demand de token cuando está próximo a expirar

- [ ] Probar logout y limpieza de tokens

- [ ] Probar interceptor HTTP añadiendo token a TODAS las peticiones cuando existe

- [ ] Probar que el token se añade incluso en peticiones de rutas públicas (si existe)

- [ ] Probar manejo de errores 401 del backend (intentar renovar token)

  

---

  

## Consideraciones Comunes para Ambas Tipologías

  

### Manejo de Errores

- Si el token JWT propio no se puede generar, el usuario debe poder seguir usando Cognito (fallback)

- Si la validación del token falla, intentar renovar antes de hacer logout

- Loggear errores de autenticación para debugging

  

### Performance

- Verificar expiración del token localmente (sin llamadas al backend)

- Renovar token on-demand cuando sea necesario (similar a cómo funciona Cognito)

- Usar `localStorage` para persistir token entre sesiones (consistente con AWS Cognito)

- La validación real se hace en el backend cuando el token se envía en las peticiones HTTP

  

### Seguridad

- No exponer tokens en logs

- Limpiar tokens al hacer logout

- Validar tokens antes de usarlos en peticiones HTTP

  

### Migración

- Mantener compatibilidad con el sistema actual de Cognito durante la migración

- Permitir fallback a Cognito si el nuevo sistema falla

- Migrar gradualmente, proyecto por proyecto

  

---

  

## Orden de Implementación Recomendado

  

### Para Tipología 1 (Login Obligatorio):

1. Fase 1: Configuración y Servicios Base

2. Fase 2: Actualizar Servicio de Autenticación

3. Fase 3: Interceptor HTTP

4. Fase 4: Actualizar AuthGuard

5. Fase 5: Actualizar Componente de Login

6. Fase 6: Actualizar Logout

7. Fase 7: Testing

  

### Para Tipología 2 (Web Pública/Privada):

1. Fase 1: Configuración y Servicios Base

2. Fase 2: Actualizar Servicio de Autenticación

3. Fase 3: Interceptor HTTP

4. Fase 4: Crear/Actualizar AuthGuard

5. Fase 5: Actualizar Componente de Login

6. Fase 6: Actualizar Logout

7. Fase 7: Manejo de Rutas Públicas vs Privadas

8. Fase 8: Testing

  

---

  

## Notas Importantes

  

- El token JWT propio se genera después del login exitoso con Cognito

- El token se almacena en `localStorage`, igual que los tokens de AWS Cognito, para mantener consistencia

- **Validación on-demand**: El token se valida de forma on-demand (como Cognito), no periódicamente:

- Se verifica la expiración localmente antes de usar

- Se renueva on-demand si está próximo a expirar

- La validación real con el backend ocurre cuando el token se envía en las peticiones HTTP

- Si el backend devuelve 401 (token inválido), se intenta renovar el token

- Si la renovación falla, se hace logout (en proyectos con login obligatorio) o se permite acceso a rutas públicas (en UI)

- El interceptor HTTP añade el token a TODAS las peticiones HTTP si existe (independientemente de si la ruta es pública o privada)

- El AuthGuard solo protege rutas específicas definidas en el routing

- El interceptor maneja errores 401 automáticamente intentando renovar el token

- Se mantiene compatibilidad con Cognito como fallback