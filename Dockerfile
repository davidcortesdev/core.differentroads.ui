# Usar una imagen base de Node.js 22
FROM node:22-alpine AS build

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de la aplicación
COPY . .

# Build argument para especificar el comando de build
ARG BUILD_COMMAND=build:prod

# Construir la aplicación Angular usando el comando especificado
RUN npm run ${BUILD_COMMAND}

# Usar una imagen base de Nginx para servir la aplicación
FROM nginx:alpine
COPY --from=build /app/dist/core.differentroads.ui/browser /usr/share/nginx/html

# Copiar el archivo de configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Comando para ejecutar Nginx
CMD ["nginx", "-g", "daemon off;"]