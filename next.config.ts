import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Mux thumbnails
      { protocol: "https", hostname: "image.mux.com" },
      // R2 / CDN-hosted post images and avatars
      { protocol: "https", hostname: "**.shopi.co.ke" },
      // TikTok cover images (embedded posts)
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.tiktokcdn-us.com" },
      // OAuth avatars
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
    ],
  },
};

export default nextConfig;
