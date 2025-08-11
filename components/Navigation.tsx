'use client';

import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Link,
  Button,
  Switch
} from "@heroui/react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { 
  FileText, 
  Github, 
  Moon, 
  Sun,
  Home,
  BookOpen,
  HelpCircle,
  Map
} from "lucide-react";
import { useTheme } from "next-themes";
import { Image } from "@heroui/react";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Map", href: "/map", icon: Map },
    { name: "Documentation", href: "/docs", icon: BookOpen }
  ];

  if (!mounted) return null;

  return (
    <Navbar 
      onMenuOpenChange={setIsMenuOpen}
      isMenuOpen={isMenuOpen}
      isBordered
      maxWidth="xl"
    >
      {/* Mobile Menu Toggle */}
      <NavbarContent className="sm:hidden" justify="start">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        />
      </NavbarContent>

      {/* Brand */}
      <NavbarContent className="pr-3" justify="start">
        <NavbarBrand>
          <Link href="/" className="flex items-center gap-3 text-inherit">
            <Image
              src="/logo.png"
              alt="Country State City"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <div className="hidden sm:block">
              <p className="font-bold text-inherit">Country State City</p>
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop Menu */}
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <NavbarItem>
          <Link 
            color="foreground"
            href="/"
            className={pathname === "/" ? "font-bold text-default-900 dark:text-default-100" : ""}
          >
            Home
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link 
            color="foreground"
            href="/map"
            className={pathname === "/map" ? "font-bold text-default-900 dark:text-default-100" : ""}
          >
            Map
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link 
            color="foreground"
            href="/docs"
            className={pathname === "/docs" ? "font-bold text-default-900 dark:text-default-100" : ""}
          >
            Documentation
          </Link>
        </NavbarItem>
      </NavbarContent>

      {/* Right Section */}
      <NavbarContent justify="end">
        <NavbarItem>
          <Switch
            defaultSelected={theme === 'dark'}
            size="sm"
            color="primary"
            startContent={<Sun size={16} />}
            endContent={<Moon size={16} />}
            onValueChange={(isSelected) => setTheme(isSelected ? 'dark' : 'light')}
          />
        </NavbarItem>
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu>
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.name}-${index}`}>
            <Link
              className={`w-full flex items-center gap-2 ${pathname === item.href ? "font-bold text-default-900 dark:text-default-100" : ""}`}
              color="foreground"
              href={item.href}
              size="lg"
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </Navbar>
  );
}