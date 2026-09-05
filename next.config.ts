import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // LAN経由（スマホ実機など）で開発サーバーにアクセスした際、
  // JSチャンク・HMRがクロスオリジンとしてブロックされるのを避けるための許可リスト
  allowedDevOrigins: ["192.168.3.41"],
};

export default nextConfig;
