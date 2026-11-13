# Stage 1: Build React/Vite app
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_BASE_URL=/
ARG VITE_API_BASE_URL=
ARG VITE_APP_NAME="Dose - Bar & Drinking Tracker"
ARG VITE_APP_SHORT_NAME=Dose
ARG VITE_APP_DESCRIPTION="Track drinks, measure BAC realtime, and discover craft cocktail recipes."

ENV VITE_BASE_URL=$VITE_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_SHORT_NAME=$VITE_APP_SHORT_NAME
ENV VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION

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

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
