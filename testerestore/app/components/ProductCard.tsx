import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  priceTag: string;
  category: string;
  type: 'blade' | 'machine';
  specs: string[];
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-metallic-card border border-border transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:border-accent/40 cursor-pointer"
    >
      {/* Accent corner glow */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-accent/0 group-hover:bg-accent/20 blur-3xl transition-all duration-700" />

      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-background">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Top gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />
        {/* Bottom gradient overlay for category */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm border border-white/10 uppercase tracking-wide">
            {product.category}
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary mb-2">
          <ShieldCheck className="h-4 w-4" />
          <span>Premium Çelik Alaşımı</span>
        </div>

        <h3 className="text-base font-bold tracking-tight text-foreground group-hover:text-accent transition-colors mb-1.5 line-clamp-2">
          {product.name}
        </h3>

        <p className="text-[11px] text-muted-foreground line-clamp-3 leading-snug mb-4">
          {product.description}
        </p>

        {/* Specs Badges */}
        <div className="flex flex-wrap gap-1 mb-5">
          {product.specs.slice(0, 3).map((spec, i) => (
            <span
              key={i}
              className="inline-block rounded-md bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground"
            >
              {spec}
            </span>
          ))}
        </div>

        {/* Footer - Only Incele button */}
        <div className="mt-auto pt-4 border-t border-border">
          <span className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-xl bg-molten-grad text-white text-xs font-bold shadow-sm group-hover:glow-orange transition-all duration-300">
            <span>İncele</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
