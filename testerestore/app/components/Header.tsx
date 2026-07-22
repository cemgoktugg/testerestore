'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { ShoppingCart, Sun, Moon, Menu, X, Hammer, User, LogOut, Heart } from 'lucide-react';
import SearchBox from './SearchBox';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { cartCount } = useCart();
  const { customer, isAuthenticated, logout } = useCustomer();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Ana Sayfa', href: '/' },
    { name: 'Bi-Metal', href: '/?kategori=Bi-Metal#products' },
    { name: 'Ahşap Kesim', href: '/?kategori=Ah%C5%9Fap+Kesim#products' },
    { name: 'Et ve Kemik Kesim', href: '/?kategori=Et+ve+Kemik+Kesim#products' },
    { name: 'Karbür Uçlu', href: '/?kategori=Karb%C3%BCr+U%C3%A7lu#products' },
    { name: 'Dijital Katalog', href: '/katalog' },
    { name: 'Blog', href: '/blog' },
    { name: 'İletişim', href: '/iletisim' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md">
      {/* ÜST SATIR — Logo + Arama + Aksiyonlar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 lg:gap-8 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-molten-grad text-white transform group-hover:rotate-12 transition-transform duration-300 shadow-md">
            <Hammer className="h-5 w-5" />
          </div>
          <span className="text-lg sm:text-xl font-black tracking-tight text-foreground hidden sm:inline">
            TESTERE<span className="text-accent font-bold">STORE</span>
          </span>
        </Link>

        {/* Arama — orta alanı kapsar, geniş kullanılabilir */}
        <div className="flex-1 max-w-2xl hidden md:block">
          <SearchBox variant="desktop" wide />
        </div>

        {/* Sağ aksiyonlar */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
          {/* Mobile arama trigger */}
          <SearchBox variant="mobile" />

          {/* Tema */}
          <button
            onClick={toggleTheme}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
            aria-label="Toggle Theme"
            title={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-950 dark:text-indigo-300" />
            )}
          </button>

          {/* Favoriler (giriş yapanlar için) */}
          {isAuthenticated && (
            <Link
              href="/hesabim/favoriler"
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-rose-500 transition-all duration-200"
              aria-label="Favorilerim"
              title="Favorilerim"
            >
              <Heart className="h-4 w-4" />
            </Link>
          )}

          {/* Hesap */}
          {isAuthenticated ? (
            <Link
              href="/hesabim"
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1 hover:border-accent/40 transition-colors"
              title="Hesabım"
            >
              <div className="h-7 w-7 rounded-full bg-molten-grad text-white flex items-center justify-center text-[11px] font-bold">
                {(customer?.first_name?.[0] || customer?.email?.[0] || 'U').toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-foreground max-w-[80px] truncate">
                {customer?.first_name || customer?.email?.split('@')[0] || 'Hesabım'}
              </span>
            </Link>
          ) : (
            <Link
              href="/giris"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors"
            >
              <User className="h-3.5 w-3.5" />
              <span>Giriş</span>
            </Link>
          )}

          {/* Sepet */}
          <Link
            href="/cart"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
            aria-label="Sepetim"
            title="Sepetim"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-molten-grad text-[10px] font-bold text-white shadow-sm">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Mobil menü trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ALT SATIR — Nav linkler (sadece lg+) */}
      <nav className="hidden lg:block border-t border-border/60 bg-background/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ul className="flex items-center gap-1 h-11 overflow-x-auto scrollbar-none">
            {navLinks.map((link) => {
              const linkPath = link.href.split('?')[0].split('#')[0] || '/';
              const isActive =
                pathname === linkPath && pathname !== '/'
                  ? true
                  : pathname === link.href;
              return (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={`inline-flex items-center px-3 xl:px-4 h-11 text-[13px] font-semibold tracking-tight whitespace-nowrap transition-colors relative ${
                      isActive
                        ? 'text-accent'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {link.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent rounded-full" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* MOBİL DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card px-4 py-4 space-y-3 animate-in slide-in-from-top-4 duration-200">
          {/* Mobil arama */}
          <div className="md:hidden mb-2">
            <SearchBox variant="desktop" wide />
          </div>

          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block rounded-lg px-3 py-2 text-base font-semibold hover:bg-muted transition-colors ${
                pathname === link.href ? 'text-primary bg-muted/50' : 'text-muted-foreground'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2 border-t border-border">
            {isAuthenticated ? (
              <div className="space-y-2 px-3">
                <Link
                  href="/hesabim"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm font-semibold text-foreground"
                >
                  <User className="h-4 w-4" />
                  <span>{customer?.first_name || customer?.email}</span>
                </Link>
                <Link
                  href="/hesabim/favoriler"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm font-semibold text-foreground"
                >
                  <Heart className="h-4 w-4" />
                  <span>Favorilerim</span>
                </Link>
                <button
                  onClick={async () => {
                    await logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 py-2 text-sm font-semibold text-rose-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1 px-3">
                <Link
                  href="/giris"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm font-semibold text-foreground"
                >
                  <User className="h-4 w-4" />
                  <span>Giriş Yap</span>
                </Link>
                <Link
                  href="/kayit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-accent"
                >
                  Hesap Oluştur
                </Link>
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between px-3 text-sm text-muted-foreground">
            <span>Tema Değiştir</span>
            <button
              onClick={() => {
                toggleTheme();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 font-medium text-foreground hover:text-primary transition-all duration-200"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-500" /> Açık Mod
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-900" /> Koyu Mod
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
