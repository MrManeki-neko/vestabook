/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/**": ["./content/**"],
    },
  },
};

export default nextConfig;
