"use client";

import { 
  Card, 
  CardBody, 
  CardHeader,
  Button,
  Chip,
  Link,
  Spacer,
  Divider,
  Avatar,
  AvatarGroup,
  Badge,
  Code,
  Snippet,
  User
} from "@heroui/react";
import CountryStateCity from "@/components/CountryStateCity";
import { 
  Globe, 
  Building, 
  Home,
  Code2, 
  FileText,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Clock,
  Users,
  BarChart,
  CheckCircle
} from "lucide-react";

export default function HomePage() {
  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized API responses under 100ms",
      color: "warning"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "99.9% uptime with secure endpoints",
      color: "success"
    },
    {
      icon: Globe,
      title: "Global Coverage",
      description: "Data from 250+ countries worldwide",
      color: "primary"
    },
    {
      icon: Clock,
      title: "Real-time Updates",
      description: "Always up-to-date location data",
      color: "secondary"
    }
  ];

  const stats = [
    { label: "Countries", value: "250", icon: Globe },
    { label: "States", value: "4,963", icon: Building },
    { label: "Cities", value: "147,740", icon: Home }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Hero Section */}
      <section className="text-center py-12">
        
        <h1 className="text-5xl font-bold mb-4">
          Country State City API
        </h1>
        
        <p className="text-xl text-default-600 mb-8 max-w-2xl mx-auto">
          Access comprehensive location data with our modern RESTful API. 
          Simple, fast, and reliable.
        </p>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            color="primary"
            size="lg"
            variant="flat"
            as={Link}
            href="/docs"
          >
            Get Started
          </Button>
        </div>
      </section>

      <Spacer y={8} />

      {/* Country State City Selector */}
      <section className="mb-12">
        <CountryStateCity />
      </section>

      <Spacer y={8} />

      {/* Features Grid */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Why Choose Our API?</h2>
          <p className="text-default-600">Built for developers, by developers</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="p-4">
              <CardBody className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-${feature.color}-100 dark:bg-${feature.color}-900/20`}>
                  <feature.icon size={24} className={`text-${feature.color}`} />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-small text-default-500">
                  {feature.description}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <Spacer y={8} />

      {/* Stats Section */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Statistics</h2>
          <p className="text-default-600">Global location data at your fingertips</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardBody className="text-center py-6">
                <stat.icon className="mx-auto mb-2 text-primary" size={32} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-small text-default-500">{stat.label}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

    </div>
  );
}