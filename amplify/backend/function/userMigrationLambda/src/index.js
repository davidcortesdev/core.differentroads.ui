/**
 * Lambda Function para Migración de Usuarios de Cognito
 *
 * Implementa el trigger UserMigration según la documentación oficial de AWS:
 * https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
 *
 * Maneja dos flujos:
 * 1. UserMigration_Authentication: Migración durante el inicio de sesión
 * 2. UserMigration_ForgotPassword: Migración durante el flujo de recuperación de contraseña
 */

const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  InitiateAuthCommand,
  AdminListUsersCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Configuración del User Pool antiguo (desde variables de entorno)
const OLD_USER_POOL_ID = process.env.OLD_USER_POOL_ID || "eu-west-1_JrNbjdsBH";
const OLD_USER_POOL_REGION = process.env.OLD_USER_POOL_REGION || "eu-west-1";
const OLD_USER_POOL_CLIENT_ID = process.env.OLD_USER_POOL_CLIENT_ID;

// Cliente de Cognito para el pool antiguo
const oldPoolClient = new CognitoIdentityProviderClient({
  region: OLD_USER_POOL_REGION,
});

/**
 * Autentica un usuario en el User Pool antiguo y obtiene sus atributos
 */
async function authenticateUser(username, password) {
  if (!OLD_USER_POOL_CLIENT_ID) {
    throw new Error("OLD_USER_POOL_CLIENT_ID no está configurado");
  }

  // Intentar autenticación con ADMIN_NO_SRP_AUTH (requiere permisos de admin)
  try {
    const authParams = {
      UserPoolId: OLD_USER_POOL_ID,
      ClientId: OLD_USER_POOL_CLIENT_ID,
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    };

    const authResponse = await oldPoolClient.send(
      new AdminInitiateAuthCommand(authParams)
    );

    if (authResponse.AuthenticationResult || authResponse.ChallengeName) {
      // Autenticación exitosa, obtener atributos del usuario
      const getUserParams = {
        UserPoolId: OLD_USER_POOL_ID,
        Username: username,
      };

      const userResponse = await oldPoolClient.send(
        new AdminGetUserCommand(getUserParams)
      );

      return userResponse;
    }
  } catch (error) {
    // Si ADMIN_NO_SRP_AUTH no está habilitado, intentar USER_PASSWORD_AUTH
    if (
      error.message.includes("Auth flow not enabled") ||
      error.message.includes("not enabled for this client") ||
      error.name === "InvalidParameterException"
    ) {
      try {
        const authParams = {
          ClientId: OLD_USER_POOL_CLIENT_ID,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
          },
        };

        const authResponse = await oldPoolClient.send(
          new InitiateAuthCommand(authParams)
        );

        if (authResponse.AuthenticationResult || authResponse.ChallengeName) {
          // Autenticación exitosa, obtener atributos del usuario
          const getUserParams = {
            UserPoolId: OLD_USER_POOL_ID,
            Username: username,
          };

          const userResponse = await oldPoolClient.send(
            new AdminGetUserCommand(getUserParams)
          );

          return userResponse;
        }
      } catch (passwordAuthError) {
        // Si falla la autenticación, puede ser contraseña incorrecta o usuario no encontrado
        if (
          passwordAuthError.name === "NotAuthorizedException" ||
          passwordAuthError.name === "InvalidPasswordException" ||
          passwordAuthError.name === "UserNotFoundException"
        ) {
          return null; // Usuario no autenticado
        }
        throw passwordAuthError;
      }
    }

    // Si es error de autenticación, retornar null
    if (
      error.name === "NotAuthorizedException" ||
      error.name === "InvalidPasswordException" ||
      error.name === "UserNotFoundException"
    ) {
      console.log("MIGRATION_LOG: Error de autenticación:", error.name);
      return null;
    }

    throw error;
  }

  return null;
}

/**
 * Busca un usuario en el User Pool antiguo (sin autenticar)
 */
async function lookupUser(username) {
  try {
    const getUserParams = {
      UserPoolId: OLD_USER_POOL_ID,
      Username: username,
    };

    const userResponse = await oldPoolClient.send(
      new AdminGetUserCommand(getUserParams)
    );

    return userResponse;
  } catch (error) {
    if (error.name === "UserNotFoundException") {
      return null;
    }
    throw error;
  }
}

/**
 * Busca un usuario por email en el User Pool antiguo
 * Esto es útil cuando el username puede ser diferente al email
 */
async function lookupUserByEmail(email) {
  try {

    // AdminListUsersCommand permite filtrar por atributo usando Filter
    const listUsersParams = {
      UserPoolId: OLD_USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    };

    const listResponse = await oldPoolClient.send(
      new AdminListUsersCommand(listUsersParams)
    );

    if (listResponse.Users && listResponse.Users.length > 0) {
      const user = listResponse.Users[0];
      // Convertir el formato de ListUsers a GetUser
      return {
        Username: user.Username,
        UserAttributes: user.Attributes,
        UserStatus: user.UserStatus,
        Enabled: user.Enabled,
      };
    }

    return null;
  } catch (error) {
    if (error.name === "UserNotFoundException") {
      return null;
    }
    throw error;
  }
}

/**
 * Convierte los atributos del formato Cognito al formato esperado por el trigger
 */
function formatUserAttributes(cognitoAttributes) {
  const formattedAttributes = {};

  if (cognitoAttributes && Array.isArray(cognitoAttributes)) {
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
  }

  return formattedAttributes;
}

/**
 * Handler principal de la Lambda
 *
 * Según la documentación de AWS, el evento tiene la siguiente estructura:
 * {
 *   "userName": "string",
 *   "triggerSource": "UserMigration_Authentication" | "UserMigration_ForgotPassword",
 *   "request": {
 *     "password": "string", // Solo en UserMigration_Authentication
 *     "validationData": {},
 *     "clientMetadata": {}
 *   },
 *   "response": {
 *     "userAttributes": {},
 *     "finalUserStatus": "string",
 *     "messageAction": "string",
 *     "desiredDeliveryMediums": [],
 *     "forceAliasCreation": boolean,
 *     "enableSMSMFA": boolean
 *   }
 * }
 */
exports.handler = async (event) => {
  try {
    const { triggerSource, userName, request } = event;

    if (!triggerSource) {
      throw new Error("triggerSource no proporcionado en el evento");
    }

    if (!userName) {
      throw new Error("userName no proporcionado en el evento");
    }

    let user;

    if (triggerSource === "UserMigration_Authentication") {
      // Migración durante el inicio de sesión
      const password = request?.password;

      if (!password) {
        throw new Error(
          "Password no proporcionado para UserMigration_Authentication"
        );
      }

      // Autenticar el usuario en el sistema existente
      user = await authenticateUser(userName, password);

      if (!user) {
        // Si el userName es un email, intentar buscar el usuario por email
        // y luego autenticar con el username real encontrado
        if (userName.includes("@")) {
          try {
            const userByEmail = await lookupUserByEmail(userName);

            if (userByEmail && userByEmail.Username) {
              // Intentar autenticar con el username real encontrado
              user = await authenticateUser(userByEmail.Username, password);

              if (!user) {
                throw new Error(
                  "Usuario no encontrado o credenciales inválidas"
                );
              }
            } else {
              throw new Error("Usuario no encontrado o credenciales inválidas");
            }
          } catch (lookupError) {
            throw lookupError;
          }
        } else {
          throw new Error("Usuario no encontrado o credenciales inválidas");
        }
      }

      // Formatear los atributos del usuario
      const userAttributes = formatUserAttributes(user.UserAttributes);

      // Verificar que el email esté presente (requerido)
      if (!userAttributes.email) {
        throw new Error("El usuario debe tener un email válido");
      }

      // Preparar la respuesta según la documentación de AWS
      event.response = {
        userAttributes: userAttributes,
        finalUserStatus:
          user.UserStatus === "CONFIRMED" ? "CONFIRMED" : "RESET_REQUIRED",
        messageAction: "SUPPRESS", // No enviar email de bienvenida
      };

      return event;
    } else if (triggerSource === "UserMigration_ForgotPassword") {
      // Migración durante el flujo de recuperación de contraseña
      console.log(
        "MIGRATION_LOG: Migración durante forgot password para:",
        userName
      );

      // Buscar el usuario en el sistema existente (sin autenticar)
      user = await lookupUser(userName);

      if (!user) {
        console.log("MIGRATION_LOG: Usuario no encontrado");
        throw new Error("Usuario no encontrado");
      }

      // Formatear los atributos del usuario
      const userAttributes = formatUserAttributes(user.UserAttributes);

      // Verificar que el email o teléfono esté presente (requerido para reset password)
      if (!userAttributes.email && !userAttributes.phone_number) {
        throw new Error(
          "El usuario debe tener un email o teléfono válido para reset password"
        );
      }

      // Asegurar que el email esté verificado si existe
      if (userAttributes.email && !userAttributes.email_verified) {
        userAttributes.email_verified = "true";
      }

      // Asegurar que el teléfono esté verificado si existe
      if (
        userAttributes.phone_number &&
        !userAttributes.phone_number_verified
      ) {
        userAttributes.phone_number_verified = "true";
      }

      // Preparar la respuesta según la documentación de AWS
      event.response = {
        userAttributes: userAttributes,
        messageAction: "SUPPRESS", // No enviar email de bienvenida
      };

      return event;
    } else {
      throw new Error(`Trigger source no soportado: ${triggerSource}`);
    }
  } catch (error) {
    console.error("MIGRATION_LOG: Error en migración:", error.message);
    console.error("MIGRATION_LOG: Stack trace:", error.stack);

    // Lanzar error para que Cognito lo maneje
    throw error;
  }
};
