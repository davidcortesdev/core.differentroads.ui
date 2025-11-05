/**
 * Lambda Function para Migración Just-In-Time de Usuarios de Cognito
 *
 * IMPORTANTE: Este trigger SOLO se ejecuta cuando un usuario intenta iniciar sesión y NO existe
 * en el nuevo User Pool. Si el usuario ya existe en el nuevo pool, Cognito NO invoca esta Lambda
 * y simplemente intenta autenticar al usuario normalmente con las credenciales proporcionadas.
 *
 * Flujo de migración:
 * 1. Usuario intenta iniciar sesión en el nuevo pool
 * 2. Si NO existe → Cognito invoca esta Lambda
 * 3. Lambda valida credenciales en el pool antiguo
 * 4. Si válidas → Retorna atributos del usuario
 * 5. Cognito crea el usuario automáticamente en el nuevo pool
 * 6. Usuario puede continuar usando sus credenciales originales
 *
 * Una vez migrado, el usuario queda en el nuevo pool y no se vuelve a migrar.
 */

const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Configuración de los User Pools (desde variables de entorno o valores por defecto)
const OLD_USER_POOL_ID = process.env.OLD_USER_POOL_ID || "eu-west-1_JrNbjdsBH";
const OLD_USER_POOL_REGION = process.env.OLD_USER_POOL_REGION || "eu-west-1";

// Cliente de Cognito para el pool antiguo
const oldPoolClient = new CognitoIdentityProviderClient({
  region: OLD_USER_POOL_REGION,
});

/**
 * Obtiene el App Client ID del pool antiguo para autenticación
 * Debe estar configurado como variable de entorno
 */
function getOldPoolClientId() {
  const clientId = process.env.OLD_USER_POOL_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "OLD_USER_POOL_CLIENT_ID no está configurado. Por favor configura esta variable de entorno."
    );
  }
  return clientId;
}

/**
 * Valida las credenciales del usuario en el User Pool antiguo y obtiene sus atributos
 */
async function validateAndGetUserFromOldPool(username, password) {
  const clientId = getOldPoolClientId();

  try {
    console.log(
      "MIGRATION_LOG: Intentando autenticar usuario en pool antiguo:",
      username
    );

    // Intentar autenticar en el pool antiguo para validar las credenciales
    const authParams = {
      UserPoolId: OLD_USER_POOL_ID,
      ClientId: clientId,
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    };

    const authResponse = await oldPoolClient.send(
      new AdminInitiateAuthCommand(authParams)
    );

    // Si la autenticación es exitosa (tiene resultado o challenge), el usuario es válido
    if (!authResponse.AuthenticationResult && !authResponse.ChallengeName) {
      console.log(
        "MIGRATION_LOG: Autenticación fallida - credenciales inválidas"
      );
      return null;
    }

    console.log(
      "MIGRATION_LOG: Usuario autenticado exitosamente en pool antiguo"
    );

    // Obtener los atributos del usuario del pool antiguo
    const getUserParams = {
      UserPoolId: OLD_USER_POOL_ID,
      Username: username,
    };

    const userResponse = await oldPoolClient.send(
      new AdminGetUserCommand(getUserParams)
    );

    return {
      userAttributes: userResponse.UserAttributes || [],
      userStatus: userResponse.UserStatus,
      enabled: userResponse.Enabled,
    };
  } catch (error) {
    console.error(
      "MIGRATION_LOG: Error al validar usuario en pool antiguo:",
      error.message
    );

    // Si el usuario no existe o la contraseña es incorrecta, retornar null
    if (
      error.name === "UserNotFoundException" ||
      error.name === "NotAuthorizedException" ||
      error.name === "InvalidPasswordException" ||
      error.name === "InvalidParameterException"
    ) {
      console.log(
        "MIGRATION_LOG: Usuario no encontrado o credenciales incorrectas"
      );
      return null;
    }

    // Para otros errores, lanzar excepción
    throw error;
  }
}

/**
 * Convierte los atributos del formato Cognito al formato esperado por el trigger
 */
function formatUserAttributes(cognitoAttributes) {
  const formattedAttributes = {};

  cognitoAttributes.forEach((attr) => {
    // Excluir atributos internos de Cognito que no deben migrarse
    if (
      attr.Name !== "sub" &&
      attr.Name !== "cognito:user_status" &&
      attr.Name !== "cognito:mfa_enabled"
    ) {
      formattedAttributes[attr.Name] = attr.Value;
    }
  });

  return formattedAttributes;
}

/**
 * Handler principal de la Lambda
 *
 * El evento de Cognito tiene la siguiente estructura:
 * {
 *   "userName": "usuario@email.com",
 *   "request": {
 *     "password": "password123",
 *     "userAttributes": {}
 *   },
 *   "response": {} // Se debe llenar con los atributos del usuario
 * }
 */
exports.handler = async (event) => {
  console.log(
    "MIGRATION_LOG: Evento recibido:",
    JSON.stringify(event, null, 2)
  );

  try {
    // Extraer información del evento
    const username = event.userName;
    const password = event.request?.password;

    if (!username) {
      console.error("MIGRATION_LOG: Username no proporcionado en el evento");
      throw new Error("Username no proporcionado");
    }

    if (!password) {
      console.error("MIGRATION_LOG: Password no proporcionado en el evento");
      throw new Error("Password no proporcionado");
    }

    // Validar usuario en el pool antiguo y obtener sus atributos
    const userData = await validateAndGetUserFromOldPool(username, password);

    if (!userData) {
      console.log(
        "MIGRATION_LOG: Usuario no encontrado o credenciales inválidas"
      );
      throw new Error("Usuario no encontrado o credenciales incorrectas");
    }

    // Formatear los atributos del usuario
    const formattedAttributes = formatUserAttributes(userData.userAttributes);

    // Verificar que el email esté presente (requerido)
    if (!formattedAttributes.email) {
      console.error("MIGRATION_LOG: El usuario no tiene un email válido");
      throw new Error("El usuario debe tener un email válido");
    }

    // Preparar la respuesta que Cognito espera
    // Cognito creará automáticamente el usuario con estos atributos
    const responseEvent = {
      ...event,
      response: {
        userAttributes: formattedAttributes,
        finalUserStatus:
          userData.userStatus === "CONFIRMED"
            ? "CONFIRMED"
            : "FORCE_CHANGE_PASSWORD",
        messageAction: "SUPPRESS", // No enviar email de bienvenida
      },
    };

    console.log(
      "MIGRATION_LOG: Migración completada exitosamente para:",
      username
    );
    console.log(
      "MIGRATION_LOG: Atributos migrados:",
      Object.keys(formattedAttributes).join(", ")
    );

    return responseEvent;
  } catch (error) {
    console.error("MIGRATION_LOG: Error en migración:", error.message);
    console.error("MIGRATION_LOG: Stack trace:", error.stack);

    // Lanzar error para que Cognito lo maneje
    // Esto hará que el login falle si la migración no puede completarse
    throw error;
  }
};
