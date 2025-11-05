#!/bin/bash

# Script para configurar el trigger de migración de usuarios en Cognito
# Requiere: AWS CLI configurado con permisos apropiados

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
NEW_USER_POOL_ID="us-east-2_KSSmf3Tt7"
REGION="us-east-2"
AWS_ACCOUNT_ID="318242395170"
FUNCTION_NAME="${1:-dtourswebsite-dev-userMigrationLambda}"

LAMBDA_ARN="arn:aws:lambda:${REGION}:${AWS_ACCOUNT_ID}:function:${FUNCTION_NAME}"

echo -e "${GREEN}🚀 Configurando trigger de migración de usuarios${NC}"
echo ""
echo "User Pool ID: ${NEW_USER_POOL_ID}"
echo "Región: ${REGION}"
echo "Lambda Function: ${FUNCTION_NAME}"
echo "Lambda ARN: ${LAMBDA_ARN}"
echo ""

# Verificar que la Lambda existe
echo -e "${YELLOW}Verificando que la Lambda existe...${NC}"
if aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${REGION}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Lambda encontrada${NC}"
else
    echo -e "${RED}❌ Error: Lambda '${FUNCTION_NAME}' no encontrada en la región ${REGION}${NC}"
    echo "Por favor, despliega la Lambda primero."
    exit 1
fi

# Configurar el trigger en Cognito
echo -e "${YELLOW}Configurando trigger en Cognito User Pool...${NC}"
aws cognito-idp update-user-pool \
    --user-pool-id "${NEW_USER_POOL_ID}" \
    --lambda-config "UserMigration=${LAMBDA_ARN}" \
    --region "${REGION}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Trigger configurado exitosamente${NC}"
else
    echo -e "${RED}❌ Error al configurar el trigger${NC}"
    exit 1
fi

# Configurar permisos para que Cognito pueda invocar la Lambda
echo -e "${YELLOW}Configurando permisos para que Cognito pueda invocar la Lambda...${NC}"

# Verificar si el statement ya existe
STATEMENT_ID="cognito-user-migration-trigger"
SOURCE_ARN="arn:aws:cognito-idp:${REGION}:${AWS_ACCOUNT_ID}:userpool/${NEW_USER_POOL_ID}"

# Intentar agregar el permiso (puede fallar si ya existe, lo cual está bien)
aws lambda add-permission \
    --function-name "${FUNCTION_NAME}" \
    --statement-id "${STATEMENT_ID}" \
    --action "lambda:InvokeFunction" \
    --principal "cognito-idp.amazonaws.com" \
    --source-arn "${SOURCE_ARN}" \
    --region "${REGION}" \
    2>&1 | grep -v "already exists" || echo -e "${GREEN}✅ Permisos ya configurados${NC}"

echo ""
echo -e "${GREEN}✨ Configuración completada exitosamente${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Asegúrate de que OLD_USER_POOL_CLIENT_ID esté configurado como variable de entorno en la Lambda"
echo "2. Prueba iniciando sesión con un usuario del pool antiguo"
echo "3. Verifica los logs en CloudWatch para confirmar la migración"

