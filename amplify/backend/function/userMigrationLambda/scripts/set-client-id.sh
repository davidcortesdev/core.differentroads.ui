#!/bin/bash

# Script simplificado - El Client ID ya está configurado en los archivos de configuración
# Este script solo verifica que la configuración esté correcta

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
FUNCTION_NAME="${1:-dtourswebsite-dev-userMigrationLambda}"
REGION="us-east-2"
EXPECTED_CLIENT_ID="6gr3oir2ssd16a31doih8sqg7u"

echo -e "${GREEN}✅ Verificando configuración de OLD_USER_POOL_CLIENT_ID${NC}"
echo ""
echo "Lambda Function: ${FUNCTION_NAME}"
echo "Región: ${REGION}"
echo ""

# Verificar que la Lambda existe
if ! aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${REGION}" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Lambda '${FUNCTION_NAME}' no encontrada en la región ${REGION}${NC}"
    echo "Por favor, despliega la Lambda primero con: amplify push"
    exit 1
fi

# Obtener las variables de entorno actuales
echo -e "${YELLOW}Obteniendo configuración actual...${NC}"
CURRENT_CLIENT_ID=$(aws lambda get-function-configuration \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}" \
    --query 'Environment.Variables.OLD_USER_POOL_CLIENT_ID' \
    --output text 2>/dev/null || echo "")

if [ -z "$CURRENT_CLIENT_ID" ]; then
    echo -e "${YELLOW}⚠️  OLD_USER_POOL_CLIENT_ID no está configurado en la Lambda${NC}"
    echo ""
    echo "El Client ID debería estar configurado automáticamente al desplegar."
    echo "Si no está configurado, ejecuta: amplify push"
    exit 1
fi

if [ "$CURRENT_CLIENT_ID" = "$EXPECTED_CLIENT_ID" ]; then
    echo -e "${GREEN}✅ OLD_USER_POOL_CLIENT_ID está correctamente configurado: ${CURRENT_CLIENT_ID}${NC}"
else
    echo -e "${YELLOW}⚠️  OLD_USER_POOL_CLIENT_ID tiene un valor diferente${NC}"
    echo "  Esperado: ${EXPECTED_CLIENT_ID}"
    echo "  Actual:   ${CURRENT_CLIENT_ID}"
    echo ""
    echo "Para corregir, ejecuta: amplify push"
    exit 1
fi

echo ""
echo -e "${GREEN}✨ Verificación completada${NC}"
