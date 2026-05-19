FROM node:20-alpine

WORKDIR /app

# Instala dependências
COPY package*.json ./
COPY apps/dashboard/package*.json ./apps/dashboard/
RUN npm install --workspace=apps/dashboard

# Copia o código
COPY apps/dashboard ./apps/dashboard

EXPOSE 3000

CMD ["npm", "run", "dev", "-w", "apps/dashboard"]
