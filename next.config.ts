import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'preview-chat-7eeacdfa-df81-4042-9a8e-7ddb7becdce4.space-z.ai',
  ],
};

export default nextConfig;
