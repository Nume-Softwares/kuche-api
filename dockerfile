# Etapa 1: Use a imagem oficial do Node.js 22.9.0 como base
FROM node:22.9.0 AS build

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Defina o diretório de trabalho no container
WORKDIR /app

# Copie o package.json e o pnpm-lock.yaml para instalar as dependências
COPY package.json pnpm-lock.yaml ./

# Instale as dependências com pnpm
RUN pnpm install

# Copie o restante do código para dentro do container
COPY . .

# Compile o código do NestJS (se necessário)
RUN pnpm run build

# Etapa 2: Imagem de produção (usando a imagem slim para reduzir o tamanho)
FROM node:22.9.0-slim

# Instalar pnpm novamente na imagem de produção (caso seja necessário)
RUN npm install -g pnpm

# Defina o diretório de trabalho
WORKDIR /app

# Copie as dependências instaladas e o código compilado da fase anterior
COPY --from=build /app /app

# Exponha a porta para acessar a aplicação
EXPOSE 3333

# Comando para rodar a aplicação em produção
CMD ["pnpm", "run", "start:prod"]
