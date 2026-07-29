import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Zabalí do .next/standalone všetko potrebné na beh vrátane servera, takže
  // v Dockeri netreba inštalovať node_modules.
  output: "standalone",

  // Vo vývojovom režime Next.js blokuje požiadavky na svoje interné súbory
  // z inej adresy než localhost. Bez tohto by sa cez Cloudflare tunel načítalo
  // HTML, ale nie JavaScript, a stránka by nereagovala na kliknutia.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
