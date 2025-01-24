FROM node:20-alpine AS builder

WORKDIR /app

# Build args for Vite env vars (baked into the static build)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Production: serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing — redirect all 404s to index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
