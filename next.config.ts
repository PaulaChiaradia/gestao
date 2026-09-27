import type { NextConfig } from "next";

const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co").hostname;

const nextConfig: NextConfig = {
  images: {
    // Fotos de perfil ficam no Storage do Supabase (pasta pública "avatars")
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/avatars/**" }],
  },
};

export default nextConfig;
