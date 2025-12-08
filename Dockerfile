# Etapa 1: Construcción (Node.js)
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar todo el código fuente
COPY . .

# Construir la aplicación (generará la carpeta 'out')
# Nota: Asegúrate de que next.config.ts tenga output: 'export'
RUN npm run build

# Etapa 2: Servidor Web (Nginx)
FROM nginx:alpine

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos estáticos generados en la etapa anterior
COPY --from=builder /app/out /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
