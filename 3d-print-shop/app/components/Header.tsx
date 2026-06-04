'use client';

import React from 'react';
import Link from 'next/link';
import { Printer } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
          <Printer className="w-8 h-8" />
          <span>3D Print Shop</span>
        </Link>

        <nav className="hidden md:flex gap-8">
          <Link href="/" className="hover:text-blue-100 transition-colors">
            Home
          </Link>
          <Link href="#upload" className="hover:text-blue-100 transition-colors">
            Upload
          </Link>
          <Link href="/admin" className="hover:text-blue-100 transition-colors">
            Admin
          </Link>
        </nav>

        <Link
          href="#upload"
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
