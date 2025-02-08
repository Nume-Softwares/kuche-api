# Etapa 1: Use a imagem oficial do Node.js como base
FROM node:22.9.0-slim

# Instalar pnpm globalmente e netcat
RUN npm install -g pnpm && apt-get update && apt-get install -y netcat-openbsd openssl

# Defina o diretório de trabalho
WORKDIR /app

# Copie a pasta dist e outras dependências
COPY dist ./dist
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Instale as dependências
RUN pnpm install --frozen-lockfile

# Gerar o Prisma Client
RUN pnpm prisma generate

# Exponha a porta para acessar a aplicação
EXPOSE 3333

# Comando para iniciar a aplicação
CMD ["node", "dist/src/main"]