# Etapa 1: Use uma imagem base do Node.js 22.9.0
FROM node:22.9.0 AS build

# Defina o diretório de trabalho no container
WORKDIR /app

# Copie o package.json e o pnpm-lock.yaml para instalar as dependências
COPY package.json pnpm-lock.yaml ./

# Instale as dependências com npm (ou pnpm, se for o caso)
RUN npm install  # ou `RUN pnpm install` se você estiver usando pnpm

# Copie o restante do código para dentro do container
COPY . .

# Compile o código do NestJS (se necessário)
RUN npm run build  # ou `RUN pnpm run build` se estiver usando pnpm

# Etapa 2: Defina a imagem de produção
FROM node:22.9.0-slim

# Defina o diretório de trabalho
WORKDIR /app

# Copie as dependências instaladas e o código compilado
COPY --from=build /app /app

# Exponha a porta para acessar a aplicação
EXPOSE 3333

# Comando para rodar a aplicação em produção
CMD ["npm", "run", "start:prod"]
