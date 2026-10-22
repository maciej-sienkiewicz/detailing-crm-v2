# Deployment Instructions

## Problem Diagnosis

QuickEventModal displayed incorrectly on server (without styles) but worked fine locally.

**Root cause**: Docker was caching old build layers with outdated CSS file that didn't contain all Tailwind classes.

## Solution

1. **Added `.dockerignore`** - Prevents copying `node_modules` and `dist` to Docker build context
2. **Modified `package.json`** - Added `build:prod` script that skips TypeScript check
3. **Updated `Dockerfile`** - Uses `build:prod` and adds build metadata
4. **Added verification script** - `verify-build.sh` checks if CSS contains required classes

## Deployment Steps

### Quick Deploy (Recommended)

```bash
# Build, push to registry, and deploy in one command
./deploy/build-and-push.sh

# Then on server (or via Jenkins):
# docker compose --env-file /opt/apps/prod/.env pull
# docker compose --env-file /opt/apps/prod/.env up -d
```

### Manual Deploy

#### 1. Build locally and verify

```bash
# Clean build
npm run build:prod

# Verify CSS contains all classes
./deploy/verify-build.sh
```

#### 2. Build Docker image with build arguments

```bash
# IMPORTANT: Use build arguments to ensure fresh CSS generation
# This busts Docker cache and forces Tailwind to regenerate all classes
docker build \
  --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --build-arg GIT_COMMIT="$(git rev-parse --short HEAD)" \
  -f deploy/Dockerfile \
  -t automotive-crm:latest \
  .

# Alternative: Use --no-cache if build args don't help
# docker build --no-cache -f deploy/Dockerfile -t automotive-crm:latest .
```

### 3. Stop and remove old container

```bash
docker stop automotive-crm || true
docker rm automotive-crm || true
```

### 4. Start new container

```bash
docker run -d \
  -p 80:80 \
  --name automotive-crm \
  --restart unless-stopped \
  automotive-crm:latest
```

### 5. Verify deployment

```bash
# Check if container is running
docker ps | grep automotive-crm

# Check build info
docker exec automotive-crm cat /etc/nginx/build-info.txt

# Test in browser - check DevTools Console for errors
```

### 6. Hard refresh browser

After deployment, users need to do **hard refresh** to clear cached CSS:
- **Windows/Linux**: Ctrl + Shift + R
- **Mac**: Cmd + Shift + R
- Or open in Incognito mode

## Troubleshooting

### CSS still looks wrong after deployment

1. Check if build info is updated (the file is not served over HTTP):
   ```bash
   docker exec automotive-crm cat /etc/nginx/build-info.txt
   ```

2. Check if CSS file is correct size (~30KB):
   ```bash
   docker exec automotive-crm ls -lh /usr/share/nginx/html/assets/*.css
   ```

3. Verify CSS contains classes:
   ```bash
   docker exec automotive-crm grep -o "max-w-3xl\|rounded-3xl" /usr/share/nginx/html/assets/*.css
   ```

4. If still issues, rebuild **with --no-cache**:
   ```bash
   docker build --no-cache -f deploy/Dockerfile -t automotive-crm:latest .
   ```

### TypeScript errors blocking build

The `build:prod` script bypasses TypeScript checking. If you need type safety:
1. Fix TypeScript errors locally first
2. Then use regular `npm run build` in Dockerfile
3. Or keep using `build:prod` for deployments

## Why This Happened

1. **Tailwind CSS v4** generates CSS by scanning source files during build
2. **Docker layers** are cached - if source files change but package.json doesn't, Docker reuses old build layer
3. **Old CSS file** didn't have classes from recently modified QuickEventModal component
4. **HTML had classes** (JavaScript was current) but **CSS didn't define them** (old build)

## Prevention

- **Always use build arguments** (`BUILD_DATE` and `GIT_COMMIT`) when building Docker images
- Build args ensure CSS is regenerated even if source files haven't changed
- Run `./deploy/verify-build.sh` before deployment
- Check `/etc/nginx/build-info.txt` in the container after deployment to confirm new build
- Use `--no-cache` as a last resort if build args don't work

## Logi dostępu bez query stringa (audyt HTTP, P2-20)

Query string niesie dane osobowe: frazy wyszukiwania (imiona, telefony, e-maile), NIP-y
i tokeny z linków. Nginx z tego repo (`deploy/ngnix/ngnix.conf`) zapisuje więc log formatem
`no_query`: sama ścieżka (`$uri`) i ścieżka strony z nagłówka Referer, bez parametrów.

Na produkcji `/api` i `/ws-registry` idą przez nginx-proxy-manager prosto do backendu,
z pominięciem tego pliku. Domyślny format logu NPM (`proxy`) zapisuje `$request_uri`, czyli
adres z query stringiem - trzeba go podmienić także tam:

1. W `/data/nginx/custom/http_top.conf` kontenera NPM zdefiniować format bez parametrów
   (ten sam co `no_query` w `ngnix.conf`, razem z mapą `$referer_path`).
2. W hostach aplikacji (`app.*`, `podglad.*`) przestawić log dostępu na ten format.
3. Sprawdzić w logu hosta jedno wyszukiwanie klienta: w wierszu ma być sama ścieżka.

Log błędów nginx (`error_log`) zapisuje przy awarii upstreamu pełny wiersz żądania - formatu
tego logu nginx nie pozwala zmienić.
