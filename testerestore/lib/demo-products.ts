/**
 * Demo product data used as a fallback when the Medusa backend is not
 * configured or returns no products. The shape is intentionally simplified;
 * once Medusa is populated, these are ignored.
 *
 * Components import via `getDemoCatalog()` / `getDemoBestSellers()` instead
 * of hard-coding arrays — keeps Faz-7 cleanup easy.
 */

export interface DemoCatalogItem {
  id: string;
  handle: string;
  name: string;
  description: string;
  image: string;
  category: "Metal" | "Ahşap" | "Et ve Kemik" | "Karbür Uçlu";
}

export interface DemoBestSellerItem {
  id: string;
  handle: string;
  name: string;
  tagline: string;
  image: string;
  rating: number;
  reviews: number;
  sold: string;
}

const CATALOG: DemoCatalogItem[] = [
  { id: "bimetal-m42", handle: "bimetal-premium", name: "Bi-Metal M42 Şerit Testere", description: "Genel metal kesimleri için uzun ömürlü ve dengeli performans.", image: "/images/bimetal_blade.png", category: "Metal" },
  { id: "bimetal-m51", handle: "bimetal-m51", name: "Bi-Metal M51 Şerit Testere", description: "Sert alaşımlar ve yoğun sanayi kullanımı için yüksek dayanım.", image: "/images/bimetal_blade.png", category: "Metal" },
  { id: "flexback-wood", handle: "woodcut-classic", name: "Flexback Ahşap Şerit Testere", description: "Ahşap, modelleme ve marangozluk uygulamaları için esnek çözüm.", image: "/images/woodworking_blade.png", category: "Ahşap" },
  { id: "meat-bone", handle: "meat-bone", name: "Et ve Kemik Şerit Testere", description: "Gıda üretimi, kasap ve endüstriyel et işleme için hijyenik kesim.", image: "/images/woodworking_blade.png", category: "Et ve Kemik" },
  { id: "carbide-tipped", handle: "carbide-ultimate", name: "Karbür Uçlu Şerit Testere", description: "Zorlu malzemelerde yüksek hassasiyet ve uzun kesim ömrü.", image: "/images/carbide_blade.png", category: "Karbür Uçlu" },
  { id: "aluminum-cut", handle: "aluminum-cut", name: "Alüminyum Kesim Şerit Testere", description: "Alüminyum ve demir dışı metaller için temiz ve hızlı kesim.", image: "/images/bimetal_blade.png", category: "Metal" },
];

const BEST_SELLERS: DemoBestSellerItem[] = [
  { id: "bimetal-premium", handle: "bimetal-premium", name: "Bi-Metal M42 Premium Şerit Testere", tagline: "Metal, profil ve boru kesiminin tartışmasız favorisi. Yüksek aşınma direnci.", image: "/images/bimetal_blade.png", rating: 4.9, reviews: 312, sold: "5.200" },
  { id: "carbide-ultimate", handle: "carbide-ultimate", name: "Carbide Ultimate Karbür Şerit Testere", tagline: "Paslanmaz ve titanyum kesiminde rakipsiz performans. Atölye standardı.", image: "/images/carbide_blade.png", rating: 4.8, reviews: 187, sold: "2.400" },
  { id: "kraken-machine", handle: "kraken-machine", name: "Kraken Professional Şerit Testere Makinesi", tagline: "Profesyonel üretim hattınız için döküm gövdeli, lazer kılavuzlu güç merkezi.", image: "/images/bandsaw_machine.png", rating: 5.0, reviews: 94, sold: "320" },
  { id: "woodcut-classic", handle: "woodcut-classic", name: "Woodcut Classic Ağaç Kesim Şerit Testere", tagline: "Sert ve yumuşak ağaç dilimleme için yüksek esneklik ve hızlı talaş atımı.", image: "/images/woodworking_blade.png", rating: 4.7, reviews: 248, sold: "3.800" },
  { id: "bimetal-m51", handle: "bimetal-m51", name: "Bi-Metal M51 Endüstriyel Şerit", tagline: "Sert alaşımlar ve yoğun sanayi kullanımı için üst seviye M51 kalite.", image: "/images/bimetal_blade.png", rating: 4.9, reviews: 156, sold: "1.900" },
  { id: "meat-bone-pro", handle: "meat-bone-pro", name: "Et ve Kemik Pro Şerit Testere", tagline: "Gıda hattı ve kasap atölyeleri için hijyenik paslanmaz alaşım gövde.", image: "/images/woodworking_blade.png", rating: 4.8, reviews: 92, sold: "780" },
  { id: "carbide-tipped-pro", handle: "carbide-tipped-pro", name: "Karbür Uçlu Pro Şerit Testere", tagline: "Sertleştirilmiş kalıp çeliklerinde uzun ömür ve pürüzsüz kesim yüzeyi.", image: "/images/carbide_blade.png", rating: 4.9, reviews: 138, sold: "1.460" },
  { id: "aluminum-cut-plus", handle: "aluminum-cut-plus", name: "Alüminyum Kesim Plus Şerit Testere", tagline: "Alüminyum ve demir dışı metallerde temiz, hızlı ve titreşimsiz kesim.", image: "/images/bimetal_blade.png", rating: 4.7, reviews: 74, sold: "910" },
];

export function getDemoCatalog(): DemoCatalogItem[] {
  return CATALOG;
}

export function getDemoBestSellers(): DemoBestSellerItem[] {
  return BEST_SELLERS;
}
