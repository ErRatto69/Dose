# Stage 1: Build React/Vite app
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve con NGINX Alpine
FROM nginx:stable-alpine AS final

# Rimuove la configurazione di default e copia la nostra
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia la build statica generata da Vite (cartella dist)
COPY --from=build /app/dist /usr/share/nginx/html
RUN mkdir -p /usr/share/nginx/html/dose && cp -a /usr/share/nginx/html/* /usr/share/nginx/html/dose/ 2>/dev/null || true

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]