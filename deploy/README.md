# Standalone production deployment

CountryStateCity does not require a database for the hosted read API. The canonical dataset is an immutable, versioned JSON snapshot shipped with each release. Production therefore has two read-only surfaces:

- Nginx serves the Next.js static export from `/opt/countrystatecity/current/web`.
- systemd runs the bundled Node API from `/opt/countrystatecity/current/server` on `127.0.0.1:5310`; Nginx proxies `/api`.

Releases live under `/opt/countrystatecity/releases/<release-id>`. The `current` symlink is the only switch used for deploys and rollbacks.

## Build inputs

```bash
npm ci
npm test
npm run build:web
npm run test:routes
npm run build:api
```

Deploy `out/` as `web/`, and deploy `server/dist` plus `server/data` as `server/`. Keep release files read-only and owned by root. The service itself runs as the unprivileged `countrystatecity` system user.

## Runtime configuration

`/etc/countrystatecity/api.env` is root-readable (`0600`) and outside every release. It contains:

```dotenv
CSC_API_HOST=127.0.0.1
CSC_API_PORT=5310
CSC_API_KEYS=production:<sha256-hex>
CSC_CORS_ORIGIN=https://countrystatecity.tansuasici.com
CSC_RATE_LIMIT_PER_MINUTE=100
CSC_CACHE_TTL_MS=60000
CSC_MAX_BODY_BYTES=65536
CSC_DATA_DIR=/opt/countrystatecity/current/server/data
```

Only API-key hashes belong on the server. Keep raw keys in a password manager or an ignored local credential file. To rotate without downtime, temporarily configure old and new hashes as comma-separated entries, restart the service, migrate clients, then remove the old hash.

## Operations

```bash
systemctl status countrystatecity-api.service
journalctl -u countrystatecity-api.service
curl http://127.0.0.1:5310/api/v1/health
nginx -t
```

To roll back, point `/opt/countrystatecity/current` at a previously verified release, restart `countrystatecity-api.service`, and reload Nginx after `nginx -t` succeeds.

The single-process in-memory cache and per-key rate limiter are intentional for this deployment. Add Redis or Valkey only if the API is scaled to multiple processes or hosts.
