# Deploying Mesa

The live site must run a **production** server (`next start`), **not** `next dev`.
Serving with `next dev` is fragile: when new files are pulled under a running
dev server it can hot-reload into a half-broken "Module not found" state (this
is what took the dashboard down after the POS files landed). A production build
resolves every module up front, or fails the build loudly instead.

## Deploy / redeploy

On the server:

```bash
bash scripts/deploy.sh
```

That pulls `main`, runs `npm ci`, does a clean `npm run build`, and (re)starts
the app under pm2 using `ecosystem.config.js`. Put your reverse proxy (nginx,
etc.) in front of the app's `PORT` (default 3000).

First time only, if pm2 isn't installed: `npm i -g pm2`.

## Environment

Copy `.env.example` → `.env.local` (or set the vars in your host) — Supabase URL
+ keys, Sentry DSN, site URL. `next build` reads them at build time.

## Finding an already-running server

If you're not sure how the current site is being served, on the server run:

```bash
pm2 ls                                   # pm2-managed processes
systemctl list-units --type=service | grep -i mesa   # systemd service
docker ps                                # containerised
ps aux | grep -E 'next (dev|start)'      # any Next process + how it started
```

Whatever is currently running `next dev` should be stopped, then use
`scripts/deploy.sh` (pm2) going forward.
