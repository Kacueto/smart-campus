# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

# Instalamos dependencias primero para aprovechar la cache de Docker
COPY package.json package-lock.json* ./
RUN npm install

# Copiamos el resto del codigo. En dev este FS sera reemplazado por el
# bind mount definido en docker-compose, asi que el COPY funciona como
# fallback cuando la imagen se ejecuta sin volumenes.
COPY . .

EXPOSE 5173

# Vite por defecto escucha en 127.0.0.1, lo que lo hace inalcanzable
# desde fuera del contenedor. --host 0.0.0.0 lo expone en la red.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
