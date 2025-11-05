# Configuración de AWS Amplify

## Obtener Amplify Actualizado

Para sincronizar la configuración de Amplify con el backend de AWS, ejecuta el siguiente comando:

```bash
amplify pull --appId dmm4tsljz8sqh --envName dev
```

Este comando:
- Descarga la configuración más reciente del entorno `dev`
- Actualiza los archivos de configuración locales (`amplifyconfiguration.json`, `aws-exports.js`)
- Sincroniza los cambios realizados en la consola de AWS Amplify

### Requisitos Previos

- AWS Amplify CLI instalado: `npm install -g @aws-amplify/cli`
- Credenciales de AWS configuradas (access keys)

---

## Configuración Actual

### Información del Proyecto

- **App ID**: `dmm4tsljz8sqh`
- **Nombre del Proyecto**: `dtourswebsite`
- **Entorno**: `dev`
- **Región**: `us-east-2`
- **Framework**: Angular

### Servicios Configurados

#### 1. Amazon Cognito (Autenticación)

**User Pool ID**: `us-east-2_KSSmf3Tt7`  
**Client ID**: `216668bnnnnfvo2aq4ijs12mga`  
**Identity Pool ID**: `us-east-2:946d8e29-41c0-459f-afa1-b3e2d2777ae6`

**Características**:
- Autenticación por email
- Login social con Google
- Verificación de email requerida
- MFA deshabilitado
- Política de contraseñas: mínimo 8 caracteres

**Dominio OAuth**: `dtourswebsite1b190f39-1b190f39-dev.auth.us-east-2.amazoncognito.com`

**URLs de Redirección**:
- Sign In: `http://localhost:3000/es/`, `https://new.staging.differentroads.es/es/`
- Sign Out: `https://new.staging.differentroads.es/`, `http://localhost:3000/es/`

### Estructura de Archivos

```
amplify/
├── cli.json                    # Configuración de características de Amplify
├── team-provider-info.json     # Información del entorno y recursos AWS
└── .config/
    └── project-config.json     # Configuración del proyecto (build, framework)

src/
├── amplifyconfiguration.json   # Configuración de Cognito y servicios
└── aws-exports.js             # Configuración exportada para uso en código
```

### Integración en Angular

La configuración se importa en `app.module.ts`:

```typescript
import { Amplify } from 'aws-amplify';
import awsconfig from '../../src/aws-exports';
```

---

## Comandos Útiles

```bash
# Actualizar configuración desde AWS
amplify pull --appId dmm4tsljz8sqh --envName dev

# Ver estado de la configuración
amplify status

# Ver información del entorno
amplify env list
```

---

## Notas Importantes

- El archivo `amplifyconfiguration.json` es generado automáticamente por `amplify pull`
- No editar manualmente los archivos en `amplify/.config/` sin conocimiento previo
- Los cambios en la consola de AWS Amplify requieren ejecutar `amplify pull` para sincronizar localmente

