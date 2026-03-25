FROM node:22

WORKDIR /app



# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of code
COPY . .

EXPOSE 8080

CMD ["node", "index.js"]