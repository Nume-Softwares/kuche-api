# Etapa 1: Build
FROM node:22.9.0 AS build

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar o restante do código.
COPY . .

# Gerar o Prisma Client
RUN pnpm prisma generate

# Compilar o código TypeScript
RUN pnpm run build && ls -l /app  # Verificar se a pasta dist foi gerada

# Etapa 2: Produção
FROM node:22.9.0-slim

# Instalar pnpm e netcat
RUN npm install -g pnpm && apt-get update && apt-get install -y netcat-openbsd openssl

# Definir diretório de trabalho
WORKDIR /app

# Copiar apenas a pasta dist e dependências necessárias
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Expor a porta
EXPOSE 3333