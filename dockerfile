# Etapa 1: Use a imagem oficial do Node.js como base
FROM node:22.9.0 AS build

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Defina o diretório de trabalho no container
WORKDIR /app

# Copie apenas os arquivos necessários para instalar as dependências
COPY package.json pnpm-lock.yaml ./

# Instale as dependências com pnpm (modo travado para evitar problemas)
RUN pnpm install --frozen-lockfile

# Copie o restante do código para dentro do container (depois de instalar as dependências)
COPY . .

# Gerar o Prisma Client antes de rodar as migrações ou outras operações
RUN pnpm prisma generate

# Compilar o código TypeScript (gerar o diretório dist)
RUN pnpm run build

# Etapa 2: Imagem de produção (usando a imagem slim para reduzir o tamanho)
FROM node:22.9.0-slim

# Defina o diretório de trabalho
WORKDIR /app

# Copie as dependências e o código compilado da fase anterior (certifique-se de copiar a pasta dist)
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/node_modules /app/
COPY --from=build /app/dist /app/dist

# Exponha a porta para acessar a aplicação
EXPOSE 3333

# Comando para rodar o aplicativo no contêiner de produção
CMD ["node", "dist/src/main.js"]
