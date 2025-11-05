# Migración Just-In-Time de Usuarios de Cognito

Este documento describe el proceso de migración de usuarios desde el User Pool antiguo (`eu-west-1_JrNbjdsBH`) al nuevo User Pool (`us-east-2_KSSmf3Tt7`) usando una estrategia de migración Just-In-Time con Lambda Trigger.

## 📋 Resumen

La migración Just-In-Time permite que los usuarios migren automáticamente cuando intentan iniciar sesión, sin necesidad de restablecer sus contraseñas. Cuando un usuario intenta iniciar sesión en el nuevo pool y no existe, la Lambda:

1. Valida las credenciales en el pool antiguo
2. Si son válidas, crea el usuario en el nuevo pool con los mismos atributos
3. El usuario puede continuar usando sus credenciales originales

## 🔧 Componentes Implementados

### 1. Función Lambda (`userMigrationLambda`)

- **Ubicación**: `amplify/backend/function/userMigrationLambda/`
- **Runtime**: Node.js 18.x
- **Handler**: `index.handler`
- **Timeout**: 60 segundos
- **Memoria**: 256 MB

### 2. Permisos IAM

La Lambda tiene permisos para:
- Leer usuarios del pool antiguo (`eu-west-1`)
- Autenticar usuarios en el pool antiguo
- Crear usuarios en el pool nuevo (`us-east-2`)
- Escribir logs en CloudWatch

## 📝 Pasos para Configurar la Migración

### Paso 1: Obtener el App Client ID del Pool Antiguo

Necesitas el App Client ID del pool antiguo para que la Lambda pueda autenticar usuarios. Puedes obtenerlo:

1. Ve a la consola de AWS Cognito: https://console.aws.amazon.com/cognito/
2. Selecciona la región `eu-west-1`
3. Selecciona el User Pool: `esdifferent24c0b7d4_userpool_24c0b7d4-prod`
4. Ve a la sección **App clients**
5. Copia el **Client ID** del cliente que necesitas

### Paso 2: Desplegar la Lambda

#### Opción A: Usando Amplify CLI (Recomendado)

```bash
cd amplify/backend/function/userMigrationLambda/src
npm install
cd ../../..
amplify add function
```

Selecciona:
- **Function name**: `userMigrationLambda`
- **Runtime**: `Node.js 18.x`
- **Handler**: `index.handler`

Luego despliega:
```bash
amplify push
```

#### Opción B: Despliegue Manual

```bash
cd amplify/backend/function/userMigrationLambda/src
npm install
zip -r ../function.zip .
```

Luego crea la función usando AWS CLI:
```bash
aws lambda create-function \
  --function-name dtourswebsite-dev-userMigrationLambda \
  --runtime nodejs18.x \
  --role arn:aws:iam::318242395170:role/YOUR_LAMBDA_ROLE \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 256 \
  --region us-east-2
```

### Paso 3: Configurar el Trigger en Cognito

**Nota**: Todas las variables de entorno (incluyendo `OLD_USER_POOL_CLIENT_ID: 6gr3oir2ssd16a31doih8sqg7u`) están configuradas automáticamente en los archivos de configuración (`cli-inputs.json` y `userMigrationLambda-cloudformation-template.json`). Se aplicarán automáticamente al ejecutar `amplify push`.

Una vez que la Lambda esté desplegada y configurada, configura el trigger:

#### Opción A: Usando el Script (Recomendado)

```bash
cd amplify/backend/function/userMigrationLambda/scripts
./configure-trigger.sh dtourswebsite-dev-userMigrationLambda
```

Este script:
- Verifica que la Lambda existe
- Configura el trigger en Cognito
- Configura los permisos necesarios automáticamente

#### Opción B: Usando AWS Console

1. Ve a la consola de AWS Cognito: https://console.aws.amazon.com/cognito/
2. Selecciona la región `us-east-2`
3. Selecciona el User Pool: `dtourswebsite1b190f39_userpool_1b190f39-dev`
4. Ve a la sección **Lambda triggers**
5. En **User migration**, selecciona tu función Lambda: `userMigrationLambda`
6. Guarda los cambios

#### Opción C: Usando AWS CLI

```bash
aws cognito-idp update-user-pool \
  --user-pool-id us-east-2_KSSmf3Tt7 \
  --lambda-config UserMigration="arn:aws:lambda:us-east-2:318242395170:function:dtourswebsite-dev-userMigrationLambda" \
  --region us-east-2
```

**Nota**: El script `configure-trigger.sh` también configura automáticamente los permisos necesarios para que Cognito pueda invocar la Lambda.

## 🧪 Pruebas

### Prueba Manual

1. Intenta iniciar sesión con un usuario que existe en el pool antiguo pero no en el nuevo
2. Verifica los logs de CloudWatch para ver el proceso de migración
3. Confirma que el usuario puede iniciar sesión exitosamente
4. Verifica que el usuario ahora existe en el nuevo pool

### Verificar Logs

```bash
aws logs tail /aws/lambda/dtourswebsite-dev-userMigrationLambda --follow --region us-east-2
```

Los logs deberían mostrar mensajes que comienzan con `MIGRATION_LOG:` para facilitar el filtrado.

## 📊 Casos de Uso y Comportamiento

### Caso 1: Usuario NO existe en el nuevo pool (Migración)

**Escenario**: Usuario `usuario@email.com` existe en el pool antiguo pero NO en el nuevo.

**Flujo**:
1. Usuario intenta iniciar sesión en el nuevo pool
2. Cognito detecta que el usuario NO existe
3. Cognito invoca la Lambda de migración
4. Lambda valida credenciales en el pool antiguo
5. Si válidas → Lambda retorna atributos del usuario
6. Cognito crea el usuario automáticamente en el nuevo pool
7. Usuario puede iniciar sesión exitosamente

**Resultado**: Usuario migrado exitosamente al nuevo pool.

### Caso 2: Usuario YA existe en el nuevo pool (Sin migración)

**Escenario**: Usuario `usuario@email.com` ya existe en el nuevo pool (ya fue migrado anteriormente).

**Flujo**:
1. Usuario intenta iniciar sesión en el nuevo pool
2. Cognito detecta que el usuario YA existe
3. **Cognito NO invoca la Lambda** (el trigger no se ejecuta)
4. Cognito intenta autenticar al usuario normalmente con las credenciales proporcionadas
5. Si las credenciales son correctas → Login exitoso
6. Si las credenciales son incorrectas → Login falla

**Resultado**: Usuario autenticado normalmente sin migración.

**⚠️ Importante**: Una vez que un usuario es migrado, queda permanentemente en el nuevo pool. No se vuelve a migrar en intentos de login posteriores.

### Caso 3: Usuario NO existe en ningún pool

**Escenario**: Usuario `usuario@email.com` NO existe ni en el pool antiguo ni en el nuevo.

**Flujo**:
1. Usuario intenta iniciar sesión en el nuevo pool
2. Cognito detecta que el usuario NO existe
3. Cognito invoca la Lambda de migración
4. Lambda intenta validar credenciales en el pool antiguo
5. Lambda no encuentra el usuario → Retorna error
6. Cognito recibe el error → Login falla

**Resultado**: Login falla porque el usuario no existe.

### Caso 4: Usuario existe en ambos pools (Duplicado)

**Escenario**: Usuario `usuario@email.com` existe en ambos pools (caso raro, posible migración manual previa).

**Flujo**:
1. Usuario intenta iniciar sesión en el nuevo pool
2. Cognito detecta que el usuario YA existe en el nuevo pool
3. **Cognito NO invoca la Lambda**
4. Cognito intenta autenticar al usuario normalmente
5. Si las credenciales son correctas → Login exitoso usando el usuario del nuevo pool

**Resultado**: Se usa el usuario del nuevo pool. El usuario del pool antiguo queda sin uso.

### Caso 5: Usuario existe en pool antiguo pero contraseña incorrecta ⚠️

**Escenario**: Usuario `usuario@email.com` existe en el pool antiguo pero envía una contraseña incorrecta.

**Flujo**:
1. Usuario intenta iniciar sesión en el nuevo pool (el usuario NO existe aún en el nuevo pool)
2. Cognito detecta que el usuario NO existe en el nuevo pool
3. Cognito invoca la Lambda de migración
4. Lambda intenta autenticar al usuario en el pool antiguo con la contraseña proporcionada
5. **La autenticación falla** → Cognito del pool antiguo lanza `NotAuthorizedException`
6. Lambda detecta el error y retorna `null`
7. El handler principal detecta `userData === null` y lanza un error
8. Cognito recibe el error y **rechaza el login**

**Resultado**: El login falla con el mensaje "Usuario no encontrado o credenciales incorrectas".

**⚠️ Importante**: 
- **Por seguridad, la Lambda NO revela si el usuario existe o no** - siempre retorna el mismo mensaje de error genérico
- Esto evita ataques de enumeración de usuarios (donde un atacante podría descubrir qué usuarios existen)
- El usuario debe usar la contraseña correcta para poder migrarse
- **El usuario NO se crea en el nuevo pool** si la contraseña es incorrecta

**Logs esperados en CloudWatch**:
```
MIGRATION_LOG: Intentando autenticar usuario en pool antiguo: usuario@email.com
MIGRATION_LOG: Error al validar usuario en pool antiguo: [error message]
MIGRATION_LOG: Contraseña incorrecta - el usuario existe pero la contraseña es inválida
MIGRATION_LOG: Migración rechazada - usuario no encontrado o contraseña incorrecta
```

## ⚠️ Consideraciones Importantes

1. **App Client ID del Pool Antiguo**: ✅ Ya está configurado automáticamente (`6gr3oir2ssd16a31doih8sqg7u`) en los archivos de configuración (`cli-inputs.json` y `userMigrationLambda-cloudformation-template.json`). Se aplicará automáticamente al ejecutar `amplify push`.

2. **Usuarios con Google OAuth**: Los usuarios que se registraron con Google OAuth NO necesitarán migración manual, ya que se autentican directamente con Google.

3. **Confirmación de Email**: Los usuarios migrados mantendrán su estado de confirmación del pool antiguo.

4. **Atributos Personalizados**: Actualmente solo se migran los atributos estándar (email, etc.). Si necesitas migrar atributos personalizados, actualiza el código de la Lambda.

5. **Rendimiento**: La migración añade latencia al primer inicio de sesión (~1-2 segundos). Después de la migración, los usuarios inician sesión normalmente.

6. **Concurrencia**: Si múltiples usuarios intentan migrar simultáneamente, la Lambda maneja esto correctamente usando el manejo de errores `UsernameExistsException`.

7. **⚠️ Usuario Ya Existe en el Nuevo Pool**: 
   - **El trigger de migración SOLO se ejecuta cuando el usuario NO existe en el nuevo User Pool**
   - Si un usuario ya existe en el nuevo pool (`us-east-2_KSSmf3Tt7`), Cognito **NO invoca la Lambda**
   - En este caso, Cognito intenta autenticar al usuario normalmente con las credenciales proporcionadas
   - Si las credenciales son correctas, el usuario inicia sesión normalmente
   - Si las credenciales son incorrectas, el login falla como siempre
   - **Esto significa que una vez migrado, el usuario queda en el nuevo pool y no se vuelve a migrar**

## 🔍 Troubleshooting

### Error: "Client ID del pool antiguo no configurado"

- Si ves este error después de desplegar, verifica que ejecutaste `amplify push` correctamente.
- Puedes verificar la configuración ejecutando: `./scripts/set-client-id.sh dtourswebsite-dev-userMigrationLambda`
- El Client ID debería estar configurado automáticamente desde los archivos de configuración.

### Error: "UserNotFoundException" o "NotAuthorizedException"

- Esto es normal si el usuario no existe en el pool antiguo o la contraseña es incorrecta.
- La Lambda maneja estos errores apropiadamente.
- **Por seguridad, la Lambda siempre retorna el mismo mensaje genérico** para evitar ataques de enumeración de usuarios.
- Si ves `NotAuthorizedException` en los logs, significa que el usuario existe pero la contraseña es incorrecta.
- Si ves `UserNotFoundException`, significa que el usuario no existe en el pool antiguo.

### Error: "AccessDeniedException"

- Verifica que la Lambda tenga los permisos IAM correctos.
- Verifica que el User Pool tenga permisos para invocar la Lambda.

### Usuario no se migra

- Revisa los logs de CloudWatch para ver el error específico.
- Verifica que el trigger esté correctamente configurado en Cognito.
- Asegúrate de que el usuario existe en el pool antiguo.

## 🛠️ Scripts Auxiliares

En el directorio `amplify/backend/function/userMigrationLambda/scripts/` encontrarás:

1. **`configure-trigger.sh`**: Configura el trigger en Cognito y los permisos necesarios
   ```bash
   ./configure-trigger.sh [FUNCTION_NAME]
   ```

2. **`set-client-id.sh`**: Verifica que la variable de entorno `OLD_USER_POOL_CLIENT_ID` esté correctamente configurada
   ```bash
   ./set-client-id.sh [FUNCTION_NAME]
   ```
   **Nota**: El Client ID ya está configurado en los archivos de configuración, este script solo verifica.

## 📚 Referencias

- [AWS Cognito User Migration Lambda Trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html)
- [AWS SDK for JavaScript v3 - Cognito Identity Provider](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cognito-identity-provider/)

