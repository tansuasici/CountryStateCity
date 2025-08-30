# Country State City

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
- **🔧 RESTful API**: Comprehensive API endpoints
- **📦 NPM Package**: Easy integration with your projects
- **🛡️ ISO Standards**: ISO 3166-1 compliant country codes

## 📋 Prerequisites

- Node.js 18.0 or later
- npm or yarn package manager


## 📚 API Documentation


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