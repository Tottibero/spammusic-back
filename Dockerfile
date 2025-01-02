FROM node:18

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el código fuente y el archivo .env
COPY . .

# Exponer el puerto
EXPOSE 3000

# Ejecutar la aplicación
CMD ["npm", "run", "start:prod"]
