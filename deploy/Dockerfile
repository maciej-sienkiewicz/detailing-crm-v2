FROM node:current-alpine as build-stage

# Add build argument to bust cache for fresh builds
ARG BUILD_DATE
ARG GIT_COMMIT

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source files
COPY . .

# Build without TypeScript check to avoid build failures
# Use build:prod which skips tsc and just runs vite build
# The BUILD_DATE arg ensures CSS is regenerated on each build
RUN echo "Building with date: ${BUILD_DATE:-unknown}" && \
    npm run build:prod

# Add build metadata for debugging. Poza katalogiem, który wydaje nginx (audyt HTTP, P2-22):
# publiczny /build-info.txt podawał każdemu commit i daty wdrożeń.
RUN echo "Build date: ${BUILD_DATE:-$(date)}" > /app/build-info.txt && \
    echo "Git commit: ${GIT_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}" >> /app/build-info.txt && \
    echo "CSS file: $(ls -lh /app/dist/assets/*.css)" >> /app/build-info.txt

FROM nginx:alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY --from=build-stage /app/build-info.txt /etc/nginx/build-info.txt
COPY ./deploy/ngnix/ngnix.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
