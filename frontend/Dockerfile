FROM node:20-alpine

WORKDIR /app

ENV CI=true

# Copiar manifests primero para aprovechar caché de capa al cambiar solo código.
COPY package.json ./
COPY package-lock.json ./

# npm install (no npm ci) tolera diferencias menores entre package.json y lock.
RUN npm install --no-audit --no-fund --loglevel=warn

# Código de la app
COPY . .

EXPOSE 5173

# Vite dev server expuesto a 0.0.0.0 para que sea accesible desde fuera del container.
# El api.js apunta a http://localhost:8000 (resuelto por el browser del host).
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]
