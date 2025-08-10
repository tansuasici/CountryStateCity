# Country State City Data

A modern web application and API platform built with Next.js 15 and TypeScript, providing comprehensive location data for 250+ countries, 5,000+ states, and 150,000+ cities worldwide.

![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![HeroUI](https://img.shields.io/badge/HeroUI-Latest-purple?style=flat)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

## 🌟 Features

- **🌍 Complete Global Coverage**: 250+ countries, 5,000+ states, 150,000+ cities
- **📊 Multiple Data Formats**: JSON, CSV, XML, and YAML support
- **🎨 Modern UI**: Built with HeroUI components and Tailwind CSS
- **⚡ Fast Performance**: Optimized API responses under 100ms
- **🔍 Advanced Search**: Powerful filtering and search capabilities
- **📱 Responsive Design**: Mobile-first approach with dark mode support
- **🔧 RESTful API**: Comprehensive API with Swagger documentation
- **📦 NPM Package**: Easy integration with your projects
- **🛡️ ISO Standards**: ISO 3166-1 compliant country codes

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Library**: HeroUI (NextUI fork)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Documentation**: Swagger UI
- **Deployment**: Vercel/Netlify ready

## 📋 Prerequisites

- Node.js 18.0 or later
- npm or yarn package manager

## ⚡ Quick Start

### Clone and Install

```bash
git clone <repository-url>
cd country-state-city-nextjs
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## 📚 API Documentation

Access the interactive Swagger documentation at `/docs` endpoint.

### Sample API Endpoints

```bash
# Get all countries
GET /api/countries

# Get states by country ID
GET /api/countries/231/states

# Get cities by state ID  
GET /api/states/1416/cities

# Search with filters
GET /api/countries?search=united&limit=10
```

### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": 231,
      "name": "United States",
      "iso2": "US",
      "iso3": "USA",
      "capital": "Washington",
      "currency": "USD",
      "emoji": "🇺🇸"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

## 🎨 UI Components

The application features a clean, modern interface with:

- **Location Selector**: Interactive country/state/city picker
- **Data Tables**: Sortable and filterable data display
- **Search Interface**: Advanced filtering capabilities
- **Responsive Cards**: Mobile-optimized layout
- **Dark Mode**: Full dark theme support

## 📦 NPM Package

Install our NPM package for easy integration:

```bash
npm install countrystatecity
```

```javascript
import { CountryStateCity } from 'countrystatecity';

// Get all countries
const countries = CountryStateCity.getAllCountries();

// Get country by ISO code
const usa = CountryStateCity.getCountryByIso2('US');

// Get states by country
const states = CountryStateCity.getStatesByCountryId(usa.id);
```

## 🗂️ Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── docs/              # Swagger documentation
│   └── globals.css        # Global styles
├── components/            # React components
├── data/                  # JSON data files
├── lib/                   # Utility functions
├── types/                 # TypeScript definitions
└── public/                # Static assets
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

### Tailwind Configuration

The project uses a custom Tailwind configuration with HeroUI integration and custom animations.

## 🧪 Testing

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Manual Deployment

```bash
npm run build
# Upload .next folder and package.json to your server
```

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and test them
4. Commit your changes: `git commit -m 'Add new feature'`
5. Push to the branch: `git push origin feature/new-feature`
6. Submit a pull request

## 📊 Data Sources

Location data is compiled from reliable public sources and regularly updated to ensure accuracy and completeness.

## 🐛 Bug Reports

Found a bug? Please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

## 📈 Roadmap

- [ ] Add more data formats (Parquet, Avro)
- [ ] Implement caching layer
- [ ] Add data export functionality
- [ ] Mobile app companion
- [ ] GraphQL API support

## ⚖️ License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Data sources and contributors
- Open source community
- HeroUI team for the excellent component library

---

<div align="center">
  <strong>Made with ❤️ for developers worldwide</strong>
</div>