// pm2 process config — runs Mesa as a PRODUCTION Next.js server (`next start`),
// not `next dev`. Serving the live site with `next dev` is what caused the
// "Module not found: PosTab" half-broken hot-reload state; a production build
// resolves every module up front or fails the build loudly.
//
// Usage on the server:
//   npm ci && npm run build
//   pm2 startOrReload ecosystem.config.js && pm2 save
//
// Set PORT (and put your reverse proxy in front of it) as needed; defaults 3000.
module.exports = {
  apps: [
    {
      name: "mesa",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
      autorestart: true,
      max_restarts: 10,
      time: true,
    },
  ],
};
