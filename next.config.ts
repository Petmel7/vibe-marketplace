
import type { NextConfig } from "next";

function resolveSupabaseHostname() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl).hostname;
  } catch {
    return null;
  }
}

const supabaseHostname = resolveSupabaseHostname();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
        {
          protocol: "https",
          hostname: supabaseHostname,
          pathname: "/storage/v1/object/public/product-images/**",
        },
        {
          protocol: "https",
          hostname: supabaseHostname,
          pathname: "/storage/v1/object/public/store-assets/**",
        },
        {
          protocol: "https",
          hostname: supabaseHostname,
          pathname: "/storage/v1/object/sign/product-images/**",
        },
        {
          protocol: "https",
          hostname: supabaseHostname,
          pathname: "/storage/v1/object/sign/store-assets/**",
        },
      ]
      : [],
  },
};

export default nextConfig;
