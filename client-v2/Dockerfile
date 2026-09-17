# Dockerfile — Production (SvelteKit 5 + adapter-static → nginx)
# ============================================================
# Build context: client-v2/
#
# Stage builder : Node 22 Alpine + pnpm (corepack) → hasil di /app/build
# Stage runner  : nginx Alpine, serve static + SPA fallback ke index.html
#
# Env public (PUBLIC_*) dibaca Vite saat BUILD, jadi wajib ada di tahap builder.
# Urutan sumber nilai (paling akhir menang):
#   1. default di src/lib/pb.ts
#   2. file .env.${BRANCH} (kalau ada)
#   3. build-args PUBLIC_PB_URL / PUBLIC_API_URL (kalau diisi Makefile)

FROM node:22-alpine AS builder

ARG BRANCH=production
ARG PUBLIC_PB_URL
ARG PUBLIC_API_URL

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    else \
      pnpm install; \
    fi

COPY . .

RUN if [ -f ".env.${BRANCH}" ]; then cp ".env.${BRANCH}" .env; fi && \
    if [ -n "${PUBLIC_PB_URL}" ]; then echo "PUBLIC_PB_URL=${PUBLIC_PB_URL}" >> .env; fi && \
    if [ -n "${PUBLIC_API_URL}" ]; then echo "PUBLIC_API_URL=${PUBLIC_API_URL}" >> .env; fi

RUN pnpm build


FROM nginx:1.27-alpine AS runner

COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
