#!/bin/bash

# Script de diagnóstico completo para verificar por qué la Lambda no se ejecuta
# Ejecuta este script para verificar todos los aspectos críticos

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
NEW_USER_POOL_ID="us-east-2_KSSmf3Tt7"
REGION="us-east-2"
AWS_ACCOUNT_ID="318242395170"
FUNCTION_NAME="${1:-dtourswebsite-dev-userMigrationLambda}"

echo -e "${BLUE}🔍 Diagnóstico Completo: ¿Por qué no se ejecuta la Lambda?${NC}"
echo "============================================================"
echo ""

# 1. Verificar que la Lambda existe y obtener su ARN real
echo -e "${YELLOW}1. Verificando que la Lambda existe...${NC}"
LAMBDA_ARN=$(aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${REGION}" --query 'Configuration.FunctionArn' --output text 2>/dev/null || echo "")

if [ -z "$LAMBDA_ARN" ]; then
    echo -e "${RED}❌ ERROR CRÍTICO: Lambda '${FUNCTION_NAME}' NO existe${NC}"
    echo "   Solución: Despliega la Lambda primero con 'amplify push'"
    exit 1
fi

echo -e "${GREEN}✅ Lambda encontrada${NC}"
echo "   ARN: ${LAMBDA_ARN}"
echo ""

# 2. Verificar variables de entorno
echo -e "${YELLOW}2. Verificando variables de entorno de la Lambda...${NC}"
ENV_VARS=$(aws lambda get-function-configuration \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}" \
    --query 'Environment.Variables' \
    --output json 2>/dev/null || echo "{}")

OLD_CLIENT_ID=$(echo "$ENV_VARS" | grep -o '"OLD_USER_POOL_CLIENT_ID":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$OLD_CLIENT_ID" ]; then
    echo -e "${RED}❌ OLD_USER_POOL_CLIENT_ID NO está configurado${NC}"
    echo "   Solución: ./set-client-id.sh ${FUNCTION_NAME} 6gr3oir2ssd16a31doih8sqg7u"
else
    echo -e "${GREEN}✅ OLD_USER_POOL_CLIENT_ID configurado: ${OLD_CLIENT_ID}${NC}"
fi
echo ""

# 3. Verificar trigger en Cognito
echo -e "${YELLOW}3. Verificando trigger en Cognito User Pool...${NC}"
TRIGGER_ARN=$(aws cognito-idp describe-user-pool \
    --user-pool-id "${NEW_USER_POOL_ID}" \
    --region "${REGION}" \
    --query 'UserPool.LambdaConfig.UserMigration' \
    --output text 2>/dev/null || echo "")

if [ -z "$TRIGGER_ARN" ] || [ "$TRIGGER_ARN" = "None" ]; then
    echo -e "${RED}❌ ERROR CRÍTICO: Trigger NO está configurado en Cognito${NC}"
    echo "   Esta es probablemente la causa del problema"
    echo ""
    echo -e "${YELLOW}   Solución:${NC}"
    echo "   cd amplify/backend/function/userMigrationLambda/scripts"
    echo "   ./configure-trigger.sh ${FUNCTION_NAME}"
    echo ""
else
    echo -e "${GREEN}✅ Trigger configurado: ${TRIGGER_ARN}${NC}"
    
    if [ "$TRIGGER_ARN" = "$LAMBDA_ARN" ]; then
        echo -e "${GREEN}✅ El ARN coincide con la Lambda${NC}"
    else
        echo -e "${YELLOW}⚠️  El ARN del trigger no coincide con la Lambda${NC}"
        echo "   Trigger ARN: ${TRIGGER_ARN}"
        echo "   Lambda ARN:  ${LAMBDA_ARN}"
        echo ""
        echo -e "${YELLOW}   Solución: Reconfigurar el trigger${NC}"
        echo "   cd amplify/backend/function/userMigrationLambda/scripts"
        echo "   ./configure-trigger.sh ${FUNCTION_NAME}"
    fi
fi
echo ""

# 4. Verificar permisos de Cognito para invocar Lambda
echo -e "${YELLOW}4. Verificando permisos para que Cognito pueda invocar la Lambda...${NC}"
SOURCE_ARN="arn:aws:cognito-idp:${REGION}:${AWS_ACCOUNT_ID}:userpool/${NEW_USER_POOL_ID}"
POLICY=$(aws lambda get-policy \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}" \
    --output text 2>/dev/null || echo "")

if echo "$POLICY" | grep -q "$SOURCE_ARN"; then
    echo -e "${GREEN}✅ Permisos configurados correctamente${NC}"
else
    echo -e "${RED}❌ Permisos NO configurados${NC}"
    echo "   Cognito no puede invocar la Lambda"
    echo ""
    echo -e "${YELLOW}   Solución:${NC}"
    echo "   cd amplify/backend/function/userMigrationLambda/scripts"
    echo "   ./configure-trigger.sh ${FUNCTION_NAME}"
fi
echo ""

# 5. Verificar que el User Pool tiene el trigger habilitado
echo -e "${YELLOW}5. Verificando configuración completa del User Pool...${NC}"
ALL_TRIGGERS=$(aws cognito-idp describe-user-pool \
    --user-pool-id "${NEW_USER_POOL_ID}" \
    --region "${REGION}" \
    --query 'UserPool.LambdaConfig' \
    --output json 2>/dev/null || echo "{}")

if echo "$ALL_TRIGGERS" | grep -q "UserMigration"; then
    echo -e "${GREEN}✅ LambdaConfig contiene UserMigration${NC}"
else
    echo -e "${RED}❌ LambdaConfig NO contiene UserMigration${NC}"
fi
echo ""

# 6. Verificar logs recientes
echo -e "${YELLOW}6. Verificando logs recientes de la Lambda...${NC}"
LOG_GROUP="/aws/lambda/${FUNCTION_NAME}"

if aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" --region "${REGION}" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$LOG_GROUP"; then
    echo -e "${GREEN}✅ Log group existe${NC}"
    
    # Buscar logs recientes (últimas 24 horas)
    echo ""
    echo -e "${YELLOW}   Últimos logs (últimas 24 horas):${NC}"
    START_TIME=$(date -u -d '24 hours ago' +%s)000
    END_TIME=$(date -u +%s)000
    
    LOG_STREAMS=$(aws logs describe-log-streams \
        --log-group-name "$LOG_GROUP" \
        --order-by LastEventTime \
        --descending \
        --max-items 5 \
        --region "${REGION}" \
        --query 'logStreams[*].logStreamName' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$LOG_STREAMS" ]; then
        echo -e "${GREEN}   Hay logs recientes${NC}"
        echo ""
        echo "   Para ver logs en tiempo real:"
        echo "   aws logs tail ${LOG_GROUP} --follow --region ${REGION} --filter-pattern 'MIGRATION_LOG'"
    else
        echo -e "${YELLOW}   ⚠️  No hay logs recientes${NC}"
        echo "   Esto significa que la Lambda NO se ha ejecutado"
        echo "   Posibles causas:"
        echo "   - El trigger no está configurado (ver paso 3)"
        echo "   - El usuario ya existe en el nuevo pool"
        echo "   - No has intentado iniciar sesión aún"
    fi
else
    echo -e "${YELLOW}⚠️  No hay log group aún${NC}"
    echo "   Esto es normal si la Lambda no se ha ejecutado nunca"
fi
echo ""

# 7. Verificar un usuario específico (si se proporciona)
if [ -n "$2" ]; then
    USERNAME="$2"
    echo -e "${YELLOW}7. Verificando usuario: ${USERNAME}${NC}"
    
    # Verificar si existe en el nuevo pool
    EXISTS_NEW=$(aws cognito-idp admin-get-user \
        --user-pool-id "${NEW_USER_POOL_ID}" \
        --username "${USERNAME}" \
        --region "${REGION}" \
        --query 'Username' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$EXISTS_NEW" ]; then
        echo -e "${RED}❌ El usuario YA EXISTE en el nuevo pool${NC}"
        echo "   El trigger NO se ejecutará porque el usuario ya existe"
        echo ""
        echo -e "${YELLOW}   Solución: Elimina el usuario del nuevo pool para probar la migración${NC}"
        echo "   aws cognito-idp admin-delete-user \\"
        echo "     --user-pool-id ${NEW_USER_POOL_ID} \\"
        echo "     --username ${USERNAME} \\"
        echo "     --region ${REGION}"
    else
        echo -e "${GREEN}✅ El usuario NO existe en el nuevo pool${NC}"
        echo "   El trigger debería ejecutarse cuando intentes iniciar sesión"
    fi
    
    # Verificar si existe en el pool antiguo
    EXISTS_OLD=$(aws cognito-idp admin-get-user \
        --user-pool-id eu-west-1_JrNbjdsBH \
        --username "${USERNAME}" \
        --region eu-west-1 \
        --query 'Username' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$EXISTS_OLD" ]; then
        echo -e "${GREEN}✅ El usuario existe en el pool antiguo${NC}"
    else
        echo -e "${YELLOW}⚠️  El usuario NO existe en el pool antiguo${NC}"
        echo "   La migración fallará si el usuario no existe en el pool antiguo"
    fi
    echo ""
fi

# Resumen final
echo -e "${BLUE}📋 Resumen de Verificación${NC}"
echo "================================"
echo ""

# Contar errores críticos
ERRORS=0
if [ -z "$TRIGGER_ARN" ] || [ "$TRIGGER_ARN" = "None" ]; then
    ERRORS=$((ERRORS + 1))
fi
if [ -z "$OLD_CLIENT_ID" ]; then
    ERRORS=$((ERRORS + 1))
fi
if echo "$POLICY" | grep -q "$SOURCE_ARN"; then
    true
else
    ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Configuración parece correcta${NC}"
    echo ""
    echo "Si la Lambda aún no se ejecuta, verifica:"
    echo "1. El usuario NO existe en el nuevo pool"
    echo "2. Estás intentando iniciar sesión con credenciales correctas"
    echo "3. Verifica los logs mientras intentas iniciar sesión:"
    echo "   aws logs tail ${LOG_GROUP} --follow --region ${REGION}"
else
    echo -e "${RED}❌ Se encontraron ${ERRORS} problema(s)${NC}"
    echo ""
    echo "Soluciones:"
    echo ""
    if [ -z "$TRIGGER_ARN" ] || [ "$TRIGGER_ARN" = "None" ]; then
        echo -e "${RED}1. Configurar el trigger:${NC}"
        echo "   cd amplify/backend/function/userMigrationLambda/scripts"
        echo "   ./configure-trigger.sh ${FUNCTION_NAME}"
        echo ""
    fi
    if [ -z "$OLD_CLIENT_ID" ]; then
        echo -e "${RED}2. Configurar Client ID:${NC}"
        echo "   cd amplify/backend/function/userMigrationLambda/scripts"
        echo "   ./set-client-id.sh ${FUNCTION_NAME} 6gr3oir2ssd16a31doih8sqg7u"
        echo ""
    fi
    if echo "$POLICY" | grep -q "$SOURCE_ARN"; then
        true
    else
        echo -e "${RED}3. Configurar permisos:${NC}"
        echo "   cd amplify/backend/function/userMigrationLambda/scripts"
        echo "   ./configure-trigger.sh ${FUNCTION_NAME}"
        echo ""
    fi
fi

echo ""
echo -e "${BLUE}💡 Comandos útiles:${NC}"
echo "================================"
echo "Ver logs en tiempo real:"
echo "  aws logs tail ${LOG_GROUP} --follow --region ${REGION} --filter-pattern 'MIGRATION_LOG'"
echo ""
echo "Verificar si un usuario existe en el nuevo pool:"
echo "  aws cognito-idp admin-get-user --user-pool-id ${NEW_USER_POOL_ID} --username TU_USUARIO@ejemplo.com --region ${REGION}"
echo ""
echo "Eliminar usuario del nuevo pool (para probar migración):"
echo "  aws cognito-idp admin-delete-user --user-pool-id ${NEW_USER_POOL_ID} --username TU_USUARIO@ejemplo.com --region ${REGION}"
echo ""

