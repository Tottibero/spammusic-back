FROM node:18

# Establecer el directorio de trabajo
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el código fuente y construir la aplicación
COPY . .
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Ejecutar la aplicación
CMD ["node", "dist/main"]
