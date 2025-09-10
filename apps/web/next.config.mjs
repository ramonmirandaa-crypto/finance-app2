import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  output: 'standalone'
};

export default withSentryConfig(nextConfig, { silent: true });
