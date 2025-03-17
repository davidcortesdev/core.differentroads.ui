# Configuración de Inicio de Sesión con Google en AWS Cognito

Este documento describe los pasos necesarios para configurar el inicio de sesión con Google utilizando Amazon Cognito y AWS Amplify en una aplicación.

---
## **1. Configuración de Cognito**

### **Paso 1: Configurar el User Pool en Cognito**

1. Accede a la consola de AWS Cognito: [Amazon Cognito](https://console.aws.amazon.com/cognito/)
2. Ve a **User pools** y selecciona tu pool de usuarios:
   - `dtourswebsite1b190f39_userpool_1b190f39-dev`
3. Dirígete a la sección **App clients**.
4. Selecciona el cliente de la aplicación correspondiente:
   - `dtours1b190f39_app_clientWeb`
5. En la pestaña **Login pages**, configura las URL de redirección:
   - URL de redirección después del inicio de sesión
   - URL de redirección después del cierre de sesión

### **Paso 2: Configurar Google como proveedor de identidad**

1. En Cognito, ve a la sección **Identity providers**.
2. Selecciona Google y proporciona:
   - Client ID
   - Client Secret (obtenidos desde Google Developer Console)
3. Guarda los cambios.

---
## **2. Configuración de AWS Amplify**

### **Paso 3: Instalar AWS Amplify CLI**

Asegúrate de tener Node.js y npm instalados en tu sistema. Luego, instala Amplify CLI globalmente ejecutando:

```bash
npm install -g @aws-amplify/cli
```

### **Paso 4: Vincular la aplicación con Amplify**

Ejecuta el siguiente comando para conectar tu aplicación con Amplify:

```bash
amplify pull --appId <tu-app-id>
```

Donde `<tu-app-id>` es el ID de la aplicación que aparece en AWS Amplify.

Cuando ejecutes el comando, selecciona las siguientes opciones:

```bash
? Select the authentication method you want to use: AWS access keys
? accessKeyId: ********************
? secretAccessKey: ****************************************
? region: us-east-2 (o la región correspondiente)
? Choose your default editor: Visual Studio Code
? Choose the type of app that you're building: javascript
? What javascript framework are you using: angular
? Source Directory Path: src
? Distribution Directory Path: build
? Build Command: npm run-script build
? Start Command: npm run-script start
? Do you plan on modifying this backend? (Y/n): Y
```

*Nota:* Las claves de acceso (AWS access keys) deben ser proporcionadas por un miembro del equipo que tenga permisos adecuados.

---
## **3. Configuración del Inicio de Sesión con Google**

En tu aplicación, importa las funciones de autenticación desde AWS Amplify:

```javascript
import { signInWithRedirect } from 'aws-amplify/auth';
```

Luego, en el botón de inicio de sesión con Google, configura la función:

```javascript
const handleGoogleSignIn = () => {
  signInWithRedirect({ provider: 'Google' });
};
```

Asegúrate de que Google esté correctamente configurado como proveedor en Cognito y que los ajustes de redirección estén definidos.

---
## **4. Prueba y Verificación**

1. Inicia tu aplicación con:

   ```bash
   npm start
   ```

2. Dirígete a la página de inicio de sesión y haz clic en el botón **Iniciar sesión con Google**.
3. Verifica que seas redirigido correctamente a Google para la autenticación y luego de regreso a la aplicación.

---
## **Conclusión**

Con estos pasos, has configurado exitosamente el inicio de sesión con Google utilizando AWS Cognito y Amplify en tu aplicación. 🚀

