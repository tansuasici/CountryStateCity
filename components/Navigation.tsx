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
import { 
  FileText, 
  Github, 
  Moon, 
  Sun,
  Home,
  BookOpen,
  HelpCircle
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { name: "Home", href: "/", icon: Home },
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
              <p className="text-tiny text-default-500">Location API Service</p>
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop Menu */}
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <NavbarItem>
          <Link color="foreground" href="/">
            Home
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link color="foreground" href="/docs">
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
              className="w-full flex items-center gap-2"
              color={index === 0 ? "primary" : "foreground"}
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