import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Testere Store — Endüstriyel Şerit Testere",
    short_name: "Testere Store",
    description:
      "Türkiye'nin lider şerit testere ve şerit testere bıçağı satış platformu.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#f97316",
    lang: "tr",
    orientation: "portrait",
    categories: ["shopping", "business", "industrial"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Ana Sayfa",
        url: "/",
      },
      {
        name: "Sepetim",
        url: "/cart",
      },
      {
        name: "Hesabım",
        url: "/hesabim",
      },
    ],
  };
}
