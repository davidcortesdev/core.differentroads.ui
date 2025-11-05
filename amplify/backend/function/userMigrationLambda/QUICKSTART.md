# 🚀 Migración Just-In-Time de Cognito - Resumen Rápido

## ✅ Componentes Creados

1. **Lambda Function**: `amplify/backend/function/userMigrationLambda/`
   - Código: `src/index.js`
   - Dependencias: `src/package.json`
   - Configuración: `cli-inputs.json`

2. **Scripts de Configuración**: `scripts/`
   - `configure-trigger.sh` - Configura el trigger en Cognito
   - `set-client-id.sh` - Configura el App Client ID

3. **Documentación**: `docs/migracion-cognito-jit.md`

## 🔑 Información del Pool Antiguo

- **User Pool ID**: `eu-west-1_JrNbjdsBH`
- **Región**: `eu-west-1`
- **Nombre**: `esdifferent24c0b7d4_userpool_24c0b7d4-prod`
- **ARN**: `arn:aws:cognito-idp:eu-west-1:318242395170:userpool/eu-west-1_JrNbjdsBH`

## 🔑 Información del Pool Nuevo

- **User Pool ID**: `us-east-2_KSSmf3Tt7`
- **Región**: `us-east-2`
- **Nombre**: `dtourswebsite1b190f39_userpool_1b190f39-dev`

## 📋 Pasos Rápidos para Desplegar

### 1. Desplegar la Lambda

```bash
cd amplify/backend/function/userMigrationLambda/src
npm install
cd ../../..
amplify push
```

**Nota**: Todas las variables de entorno (incluyendo `OLD_USER_POOL_CLIENT_ID`) están configuradas automáticamente en los archivos de configuración.

### 2. Configurar Trigger en Cognito

```bash
cd amplify/backend/function/userMigrationLambda/scripts
./configure-trigger.sh dtourswebsite-dev-userMigrationLambda
```

### 3. Verificar Configuración (Opcional)

```bash
./set-client-id.sh dtourswebsite-dev-userMigrationLambda
```

Este script ahora solo verifica que la configuración esté correcta.

### 4. Probar

1. Intenta iniciar sesión con un usuario del pool antiguo
2. Verifica los logs: `aws logs tail /aws/lambda/dtourswebsite-dev-userMigrationLambda --follow --region us-east-2`
3. Confirma que el usuario se migró exitosamente

## 📚 Documentación Completa

Ver `docs/migracion-cognito-jit.md` para instrucciones detalladas y troubleshooting.

