# User Migration Lambda Function

Función Lambda para migración Just-In-Time de usuarios desde el User Pool antiguo (`eu-west-1_JrNbjdsBH`) al nuevo User Pool (`us-east-2_KSSmf3Tt7`).

## 🚀 Despliegue

### Opción 1: Usando Amplify CLI

```bash
amplify add function
```

Selecciona la opción para crear una nueva función y configura:
- Nombre: `userMigrationLambda`
- Runtime: `nodejs18.x`
- Handler: `index.handler`

Luego copia los archivos de este directorio a la función creada.

### Opción 2: Despliegue Manual

1. Instala las dependencias:
```bash
cd src
npm install
```

2. Crea el paquete:
```bash
zip -r ../function.zip .
```

3. Despliega usando AWS CLI:
```bash
aws lambda create-function \
  --function-name dtourswebsite-dev-userMigrationLambda \
  --runtime nodejs18.x \
  --role arn:aws:iam::318242395170:role/YOUR_LAMBDA_ROLE \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --region us-east-2
```

## ⚙️ Configuración

### Variables de Entorno

Todas las variables de entorno están configuradas automáticamente en los archivos de configuración:

- `OLD_USER_POOL_ID`: `eu-west-1_JrNbjdsBH`
- `OLD_USER_POOL_REGION`: `eu-west-1`
- `NEW_USER_POOL_ID`: `us-east-2_KSSmf3Tt7`
- `NEW_USER_POOL_REGION`: `us-east-2`
- `OLD_USER_POOL_CLIENT_ID`: `6gr3oir2ssd16a31doih8sqg7u` ✅ Configurado

**Nota**: Las variables de entorno se configuran automáticamente al ejecutar `amplify push`. No es necesario configurarlas manualmente.

## 📝 Estructura de Archivos

```
userMigrationLambda/
├── src/
│   ├── index.js          # Código principal de la Lambda
│   └── package.json      # Dependencias
├── cli-inputs.json       # Configuración de Amplify
├── userMigrationLambda-cloudformation-template.json  # Template CloudFormation
└── README.md             # Este archivo
```

## 🔍 Logs

Los logs de la Lambda incluyen el prefijo `MIGRATION_LOG:` para facilitar el filtrado.

Ver logs:
```bash
aws logs tail /aws/lambda/dtourswebsite-dev-userMigrationLambda --follow --region us-east-2
```

## 🔗 Enlaces Relacionados

- [Documentación completa de migración](./docs/migracion-cognito-jit.md)
- [AWS Cognito User Migration Docs](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html)

