
# Core Different Roads UI

Este proyecto fue generado con [Angular CLI](https://github.com/angular/angular-cli) versión 19.0.6.

## Estructura del Proyecto

La aplicación sigue una arquitectura modular y está organizada de la siguiente manera:

```
src/
├── app/
│   ├── core/           # Servicios core, modelos y utilidades
│   ├── layout/         # Componentes de layout (header, footer, etc.)
│   ├── pages/         # Páginas principales de la aplicación
│   └── shared/        # Componentes, directivas y pipes compartidos
├── environments/      # Configuraciones por entorno
└── assets/           # Recursos estáticos
```

### Módulos Principales

- **Core**: Contiene la lógica de negocio central y modelos de datos
- **Layout**: Gestiona la estructura visual común de la aplicación
- **Pages**: Contiene los componentes específicos de cada página
- **Shared**: Elementos reutilizables en toda la aplicación

## Flujo de Trabajo con Git

Seguimos un flujo de trabajo basado en GIT, aquí tienes [guía detallada de flujo de ramas](https://github.com/Different-Roads/core.differentroads.help/blob/main/git/flujo_ramas.md).

## Configuración del Entorno de Desarrollo

1. **Instalación de Dependencias**:
   ```bash
   npm install
   ```

2. **Servidor de Desarrollo**:
   ```bash
   npm start               # Entorno de desarrollo
   npm run start:pre      # Entorno de preproducción
   npm run start:prod     # Entorno de producción
   ```

3. **Construcción del Proyecto**:
   ```bash
   npm run build          # Build de desarrollo
   npm run build:pre     # Build de preproducción
   npm run build:prod    # Build de producción
   ```

4. **Pruebas Unitarias**:
   ```bash
   npm test
   ```

## Entornos

El proyecto cuenta con tres entornos configurados:

- **Desarrollo**: `environment.ts`
- **Preproducción**: `environment.development.ts`
- **Producción**: `environment.production.ts`

## Documentación Adicional

Para más información sobre Angular CLI, visita la [documentación oficial de Angular](https://angular.dev/tools/cli).