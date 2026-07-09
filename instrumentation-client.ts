import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Beta-scale traffic — sample generously; error sessions always replayed.
  replaysSessionSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.25,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Orders carry diner names/phone numbers and PayMongo redirects handle
      // card data — keep default text/media masking on, never loosen it.
      maskAllText: true,
      blockAllMedia: true,
      networkDetailDenyUrls: [/\/api\/paymongo/, /paymongo\.com/],
    }),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
