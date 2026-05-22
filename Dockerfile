FROM node:20-alpine

# Expo CLI needs watchman or similar; git is needed by some npm packages
RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Metro bundler + Expo DevTools ports
EXPOSE 8081 19000 19001 19002

# REACT_NATIVE_PACKAGER_HOSTNAME must be set to the HOST machine's IP
# so the QR code points to an address phones can reach.
# Set it via docker-compose (see docker-compose.yml).
ENV REACT_NATIVE_PACKAGER_HOSTNAME=localhost

CMD ["npx", "expo", "start", "--host", "lan"]
