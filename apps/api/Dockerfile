FROM node:20-alpine

WORKDIR /app

# Instala dependências
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm install --workspace=apps/api

# Copia o código
COPY apps/api ./apps/api

# Cria pasta de uploads
RUN mkdir -p apps/api/uploads

EXPOSE 3001

CMD ["npm", "run", "dev", "-w", "apps/api"]
