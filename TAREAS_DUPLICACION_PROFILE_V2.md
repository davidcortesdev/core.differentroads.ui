# Plan de Duplicación y Adaptación de Componentes Profile V2

## Objetivo
Duplicar todos los componentes del perfil actual para crear una versión V2 que funcione con un nuevo origen de datos, manteniendo la funcionalidad existente intacta.

## Estructura de Archivos a Crear

### 1. Componente Principal
- `src/app/pages/profile-v2/profile-v2.component.ts`
- `src/app/pages/profile-v2/profile-v2.component.html`
- `src/app/pages/profile-v2/profile-v2.component.scss`
- `src/app/pages/profile-v2/profile-v2.component.spec.ts`

### 2. Componentes de Sección
- `src/app/pages/profile-v2/components/personal-info-section-v2/`
- `src/app/pages/profile-v2/components/points-section-v2/`
- `src/app/pages/profile-v2/components/booking-list-section-v2/`
- `src/app/pages/profile-v2/components/review-section-v2/`
- `src/app/pages/profile-v2/components/update-profile-section-v2/`

---

## Tareas Detalladas por Componente

### 1. **PROFILE-V2 COMPONENT** (Componente Principal)

#### Tareas:
- [ ] **Crear archivos base del componente principal**
  - [ ] `profile-v2.component.ts` - Lógica principal
  - [ ] `profile-v2.component.html` - Template principal
  - [ ] `profile-v2.component.scss` - Estilos principales
  - [ ] `profile-v2.component.spec.ts` - Tests unitarios

#### Cambios en la Lógica:
- [ ] **Simplificar inputs**: Solo recibir `userId: string`
- [ ] **Eliminar dependencias de autenticación**: No usar `AuthenticateService`
- [ ] **Eliminar configuración de booking lists**: Mover a componentes hijos
- [ ] **Simplificar interfaz PersonalInfo**: Mantener solo campos esenciales
- [ ] **Eliminar lógica de edición**: Mover a componente específico

#### Estructura del Template:
```html
<div class="container">
  <div class="column left-column">
    <app-personal-info-section-v2 [userId]="userId"></app-personal-info-section-v2>
  </div>
  <div class="column right-column">
    <app-points-section-v2 [userId]="userId"></app-points-section-v2>
    <app-booking-list-section-v2 [userId]="userId" [listType]="'active-bookings'"></app-booking-list-section-v2>
    <app-booking-list-section-v2 [userId]="userId" [listType]="'travel-history'"></app-booking-list-section-v2>
    <app-booking-list-section-v2 [userId]="userId" [listType]="'recent-budgets'"></app-booking-list-section-v2>
    <app-review-section-v2 [userId]="userId"></app-review-section-v2>
  </div>
</div>
```

---

### 2. **PERSONAL-INFO-SECTION-V2** (Información Personal)

#### Tareas:
- [ ] **Duplicar archivos del componente original**
  - [ ] `personal-info-section-v2.component.ts`
  - [ ] `personal-info-section-v2.component.html`
  - [ ] `personal-info-section-v2.component.scss`
  - [ ] `personal-info-section-v2.component.spec.ts`

#### Cambios en la Lógica:
- [ ] **Input simplificado**: `@Input() userId: string`
- [ ] **Eliminar dependencias de servicios**: No conectar con APIs por ahora
- [ ] **Datos mock**: Mostrar datos de ejemplo para visualización
- [ ] **Eliminar funcionalidad de edición**: Solo mostrar información
- [ ] **Simplificar interfaz PersonalInfo**: Mantener campos básicos

#### Template:
- [ ] **Mantener diseño visual**: Copiar exactamente el HTML/SCSS
- [ ] **Mostrar datos mock**: Usar datos de ejemplo
- [ ] **Eliminar botón de edición**: Solo mostrar información

---

### 3. **POINTS-SECTION-V2** (Sección de Puntos)

#### Tareas:
- [ ] **Duplicar archivos del componente original**
  - [ ] `points-section-v2.component.ts`
  - [ ] `points-section-v2.component.html`
  - [ ] `points-section-v2.component.scss`
  - [ ] `points-section-v2.component.spec.ts`

#### Cambios en la Lógica:
- [ ] **Input simplificado**: `@Input() userId: string`
- [ ] **Eliminar dependencias de servicios**: No conectar con APIs por ahora
- [ ] **Datos mock**: Mostrar datos de ejemplo para visualización
- [ ] **Mantener funcionalidad de toggle**: Tabla de puntos
- [ ] **Datos de ejemplo**: Puntos, tarjetas de membresía, etc.

#### Funcionalidades a Mantener:
- [ ] **Toggle de tabla**: Mostrar/ocultar tabla de puntos
- [ ] **Diseño de tarjetas**: Mantener diseño visual
- [ ] **Responsive design**: Mantener adaptabilidad

---

### 4. **BOOKING-LIST-SECTION-V2** (Lista de Reservas)

#### Tareas:
- [ ] **Duplicar archivos del componente original**
  - [ ] `booking-list-section-v2.component.ts`
  - [ ] `booking-list-section-v2.component.html`
  - [ ] `booking-list-section-v2.component.scss`
  - [ ] `booking-list-section-v2.component.spec.ts`

#### Cambios en la Lógica:
- [ ] **Inputs simplificados**: 
  - `@Input() userId: string`
  - `@Input() listType: 'active-bookings' | 'travel-history' | 'recent-budgets'`
- [ ] **Conectar con nuevas APIs**: Adaptar servicios para nuevo origen de datos
- [ ] **Adaptar objetos de datos**: Mapear respuestas de API a interfaces V2
- [ ] **Mantener funcionalidad de toggle**: Expandir/colapsar sección
- [ ] **Configuración dinámica**: Basada en el tipo de lista

#### Estructura de Datos V2 ( Revisar si no se tuviera que usar y adaptarlo a lo nuevo):


#### Servicios a Adaptar (OJO, No tienen porque llamarse los nombre iguales):
- [ ] **BookingsService V2**: Adaptar métodos para nuevo origen de datos
- [ ] **ToursService V2**: Adaptar para obtener información de tours
- [ ] **OrdersService V2**: Adaptar para presupuestos
- [ ] **NotificationsService V2**: Adaptar para envío de documentos
- [ ] **Mapeo de datos**: Crear funciones de transformación de API response a BookingItemV2

#### Configuración por Tipo:
- [ ] **Active Bookings**: Reservas activas con acciones de descarga/enviar
- [ ] **Travel History**: Historial de viajes con información de origen
- [ ] **Recent Budgets**: Presupuestos recientes con acción de reservar

#### Funcionalidades a Mantener:
- [ ] **Toggle de contenido**: Expandir/colapsar
- [ ] **Diseño de items**: Mantener diseño visual
- [ ] **Botones de acción**: Mantener estructura (sin funcionalidad)
- [ ] **Paginación**: Mantener si es necesario
- [ ] **Responsive design**: Mantener adaptabilidad

---

### 5. **REVIEW-SECTION-V2** (Sección de Reseñas)

#### Tareas:
- [ ] **Duplicar archivos del componente original**
  - [ ] `review-section-v2.component.ts`
  - [ ] `review-section-v2.component.html`
  - [ ] `review-section-v2.component.scss`
  - [ ] `review-section-v2.component.spec.ts`

#### Cambios en la Lógica:
- [ ] **Input simplificado**: `@Input() userId: string`
- [ ] **Eliminar dependencias de servicios**: No conectar con APIs por ahora
- [ ] **Datos mock**: Mostrar reseñas de ejemplo
- [ ] **Mantener funcionalidad de toggle**: Expandir/colapsar sección

#### Estructura de Datos Mock:
```typescript
interface ReviewV2 {
  id: string;
  review: string;
  score: number;
  traveler: string;
  tour: string;
  date: string;
  tourId: string;
}
```

#### Funcionalidades a Mantener:
- [ ] **Toggle de contenido**: Expandir/colapsar
- [ ] **Diseño de reseñas**: Mantener diseño visual
- [ ] **Sistema de puntuación**: Mantener estrellas
- [ ] **Responsive design**: Mantener adaptabilidad

---

### 6. **UPDATE-PROFILE-SECTION-V2** (Edición de Perfil)

#### Tareas:
- [ ] **Duplicar archivos del componente original**
  - [ ] `update-profile-section-v2.component.ts`
  - [ ] `update-profile-section-v2.component.html`
  - [ ] `update-profile-section-v2.component.scss`
  - [ ] `update-profile-section-v2.component.spec.ts`

#### Cambios en la Lógica:
- [ ] **Inputs simplificados**: 
  - `@Input() userId: string`
  - `@Input() personalInfo: PersonalInfoV2`
- [ ] **Eliminar dependencias de servicios**: No conectar con APIs por ahora
- [ ] **Mantener validaciones**: Validaciones de formulario
- [ ] **Eliminar funcionalidad de guardado**: Solo mostrar formulario

#### Funcionalidades a Mantener:
- [ ] **Formulario completo**: Todos los campos
- [ ] **Validaciones**: Mantener validaciones de entrada
- [ ] **Upload de imagen**: Mantener funcionalidad visual
- [ ] **Diseño responsive**: Mantener adaptabilidad

---

## Configuración de Routing

### Tareas:
- [ ] **Agregar ruta en app-routing.module.ts**
  ```typescript
  {
    path: 'profile-v2/:userId',
    component: ProfileV2Component
  }
  ```

- [ ] **Configurar parámetros de ruta**
  - [ ] Obtener `userId` desde los parámetros de ruta
  - [ ] Pasar `userId` a todos los componentes hijos

---

## Orden de Implementación

### Fase 1: Estructura Base
1. [ ] Crear componente principal `profile-v2`
2. [ ] Configurar routing
3. [ ] Crear estructura de carpetas

### Fase 2: Componentes de Visualización
1. [ ] `personal-info-section-v2` (solo visualización)
2. [ ] `points-section-v2` (solo visualización)
3. [ ] `review-section-v2` (solo visualización)

### Fase 3: Componente de Listas
1. [ ] `booking-list-section-v2` (con datos mock por tipo)

### Fase 4: Componente de Edición
1. [ ] `update-profile-section-v2` (formulario sin guardado)

### Fase 5: Integración
1. [ ] Integrar todos los componentes
2. [ ] Probar navegación
3. [ ] Verificar responsive design

---

## Consideraciones Técnicas

### Dependencias a Eliminar:
- `AuthenticateService`
- `UsersService` (por ahora)
- `ReviewsService` (por ahora)
- `PointsService` (por ahora)

### Dependencias a Adaptar (Solo para BOOKING-LIST-SECTION-V2) (Hablar con Adri y/o Fabian de donde obtener la información): Nombres unicamente de ejemplo
- `BookingsService` → `BookingsServiceV2` (adaptado para nuevo origen de datos)
- `ToursService` → `ToursServiceV2` (adaptado para nuevo origen de datos)
- `OrdersService` → `OrdersServiceV2` (adaptado para nuevo origen de datos)
- `NotificationsService` → `NotificationsServiceV2` (adaptado para nuevo origen de datos)

### Dependencias a Mantener:
- `PrimeNG` components
- `Angular` core
- `Router` (para navegación)

### Servicios V2 a Crear (Solo para BOOKING-LIST-SECTION-V2):
- [ ] Crear servicios V2 en `src/app/core/services/v2/`
  - [ ] `BookingsServiceV2` - Adaptado para nuevo origen de datos
  - [ ] `ToursServiceV2` - Adaptado para obtener información de tours
  - [ ] `OrdersServiceV2` - Adaptado para presupuestos
  - [ ] `NotificationsServiceV2` - Adaptado para envío de documentos
- [ ] Implementar interfaces V2 en `src/app/core/models/v2/`
- [ ] Crear funciones de mapeo de datos API → Interfaces V2
- [ ] Mantener estructura de datos similar a la original pero adaptada

---

## Notas Importantes

1. **No modificar componentes originales**: Mantener funcionalidad existente intacta
2. **Mantener diseño visual**: Copiar exactamente HTML/SCSS
3. **Preparar para futuras integraciones**: Estructura lista para conectar APIs

---

## Archivos de Configuración a Actualizar

- [ ] `app-routing.module.ts` - Agregar ruta profile-v2
- [ ] `app.module.ts` - Registrar nuevos componentes

---

## Checklist Final

- [ ] Todos los componentes duplicados y adaptados
- [ ] Routing configurado
- [ ] Datos mock implementados
- [ ] Diseño visual mantenido
- [ ] Responsive design verificado
- [ ] Tests básicos creados
- [ ] Documentación actualizada
- [ ] Navegación funcional
- [ ] Sin errores de compilación
- [ ] Preparado para futuras integraciones de APIs
