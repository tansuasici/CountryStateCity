'use client';

import {
  Link,
  Chip,
  Divider
} from "@heroui/react";
import { 
  MapPin,
  FileText,
  Heart
} from "lucide-react";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const links = {
    product: [
      { name: "Features", href: "#" },
      { name: "API Status", href: "#" },
      { name: "Changelog", href: "#" }
    ],
    developers: [
      { name: "Documentation", href: "/docs" },
      { name: "Examples", href: "#" },
      { name: "SDKs", href: "#" }
    ],
    company: [
      { name: "About", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Contact", href: "#" }
    ],
    legal: [
      { name: "Privacy", href: "#" },
      { name: "Terms", href: "#" },
      { name: "License", href: "#" }
    ]
  };

  return (
    <footer className="w-full mt-20 border-t border-divider bg-background">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/logo.png"
                alt="Country State City"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div>
                <h3 className="font-bold text-lg">Country State City</h3>
                <p className="text-tiny text-default-500">Location API</p>
              </div>
            </div>
            <p className="text-small text-default-600">
              Access comprehensive location data with our modern RESTful API.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-3">Product</h4>
            <ul className="space-y-2">
              {links.product.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    size="sm"
                    color="foreground"
                    className="opacity-80 hover:opacity-100"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Developers Links */}
          <div>
            <h4 className="font-semibold mb-3">Developers</h4>
            <ul className="space-y-2">
              {links.developers.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    size="sm"
                    color="foreground"
                    className="opacity-80 hover:opacity-100"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <ul className="space-y-2">
              {links.company.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    size="sm"
                    color="foreground"
                    className="opacity-80 hover:opacity-100"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <ul className="space-y-2">
              {links.legal.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    size="sm"
                    color="foreground"
                    className="opacity-80 hover:opacity-100"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Divider className="mb-6" />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-small text-default-500">
            <span>© {currentYear} Country State City API.</span>
            <span>All rights reserved.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-small text-default-500">Made with</span>
            <Heart size={14} className="text-danger" />
            <span className="text-small text-default-500">by</span>
            <Link
              href="https://tansuasici.com/"
              isExternal
              size="sm"
              color="foreground"
              className="underline-offset-2 hover:underline"
            >
              tansuasici
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}