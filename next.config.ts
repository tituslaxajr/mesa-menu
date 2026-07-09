import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Source map upload auth token — build-time secret, set in CI/hosting env only.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,

  // Proxies Sentry's client requests through our own origin so ad-blockers don't drop them.
  tunnelRoute: "/monitoring",

  silent: !process.env.CI,

  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
