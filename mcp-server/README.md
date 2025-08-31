# @tansuasici/country-state-city-mcp

MCP (Model Context Protocol) server for accessing comprehensive country, state, and city data through MCP-compatible AI assistants and applications.

## 🌍 Features

- Access to **250+ countries**, **5,000+ states**, and **150,000+ cities** worldwide
- Full ISO codes, currencies, timezones, and geographic data
- Multiple export formats: JSON, CSV, XML, YAML
- 23 specialized tools for location data queries
- Direct resource access for bulk data operations
- Pre-configured prompts for common use cases

## 📦 Installation

### Global Installation (Recommended)
```bash
npm install -g @tansuasici/country-state-city-mcp
```

### Local Installation
```bash
npm install @tansuasici/country-state-city-mcp
```

## 🔧 Configuration

Add the server to your MCP client configuration:

```json
{
  "mcpServers": {
    "country-state-city": {
      "command": "npx",
      "args": ["@tansuasici/country-state-city-mcp"]
    }
  }
}
```

### Configuration File Locations

- **macOS**: `~/Library/Application Support/[AppName]/config.json`
- **Windows**: `%APPDATA%\[AppName]\config.json`
- **Linux**: `~/.config/[AppName]/config.json`

Replace `[AppName]` with your MCP client application name.

## 🛠️ Available Tools

### 🌐 Country Tools (7 methods)
| Tool | Description |
|------|-------------|
| `getAllCountries` | Get all countries with optional format (json/csv/xml/yaml) |
| `getCountryById` | Get country by numeric ID |
| `getCountryByIso2` | Get country by ISO2 code (e.g., "US", "TR") |
| `getCountryByIso3` | Get country by ISO3 code (e.g., "USA", "TUR") |
| `searchCountries` | Search countries by name or native name |
| `getCountriesByRegion` | Filter countries by region (e.g., "Europe", "Asia") |
| `getCountriesBySubregion` | Filter countries by subregion (e.g., "Western Europe") |

### 🏛️ State/Province Tools (5 methods)
| Tool | Description |
|------|-------------|
| `getAllStates` | Get all states/provinces with optional format |
| `getStateById` | Get state by numeric ID |
| `getStatesByCountryId` | Get states for a specific country ID |
| `getStatesByCountryCode` | Get states by country ISO code |
| `searchStates` | Search states by name with optional country filter |

### 🏙️ City Tools (5 methods)
| Tool | Description |
|------|-------------|
| `getAllCities` | Get cities (limited to first 1000 by default) |
| `getCityById` | Get city by numeric ID |
| `getCitiesByStateId` | Get all cities in a specific state |
| `getCitiesByCountryId` | Get all cities in a specific country |
| `searchCities` | Search cities by name with optional filters |

### 📊 Utility Tools (6 methods)
| Tool | Description |
|------|-------------|
| `getStats` | Get database statistics (counts of countries, states, cities) |
| `getAllRegions` | Get list of all unique regions |
| `getAllSubregions` | Get list of all unique subregions |
| `getAllTimezones` | Get list of all unique timezones |
| `getAllCurrencies` | Get list of all currencies with details |
| `exportData` | Export filtered data in specific format |

## 💡 Usage Examples

### Basic Queries
```
"Get all countries in Europe"
"Find country with ISO code TR"
"Show me all states in Turkey"
"Search for cities named Istanbul"
"Get statistics about the location database"
```

### Advanced Queries
```
"Export all European countries as CSV"
"Find all cities in California with their coordinates"
"Compare timezones between Tokyo and New York"
"List all countries using EUR currency"
"Get all states in USA and export as YAML"
```

## 📚 Resources

Direct access to raw data through MCP resources:

| Resource | Description | Data Size |
|----------|-------------|-----------|
| `csc://countries/all` | Complete country dataset | 250+ countries |
| `csc://states/all` | All states/provinces worldwide | 5,000+ states |
| `csc://cities/sample` | Sample of city data | First 1,000 cities |
| `csc://statistics` | Database statistics overview | Summary data |
| `csc://regions` | All geographic regions | Region list |
| `csc://currencies` | Complete currency list | All world currencies |
| `csc://timezones` | All timezone information | Complete timezone data |

## 🎯 Pre-configured Prompts

| Prompt | Description | Use Case |
|--------|-------------|----------|
| `travel_planner` | Multi-country travel itinerary | Trip planning with cities and attractions |
| `location_comparison` | Compare multiple locations | Analyze differences between places |
| `geography_quiz` | Generate geography quizzes | Educational content creation |
| `data_export` | Export filtered location data | Data extraction for analysis |

## 🔍 Example Tool Responses

### Get Country Info
```json
{
  "id": 225,
  "name": "Turkey",
  "iso2": "TR",
  "iso3": "TUR",
  "capital": "Ankara",
  "currency": "TRY",
  "emoji": "🇹🇷",
  "region": "Asia",
  "subregion": "Western Asia"
}
```

### Search Cities
```json
[
  {
    "id": 107062,
    "name": "Istanbul",
    "stateId": 2203,
    "countryId": 225,
    "latitude": "41.00527000",
    "longitude": "28.97696000"
  }
]
```

## 🚀 Quick Start Guide

1. **Install the package globally:**
   ```bash
   npm install -g @tansuasici/country-state-city-mcp
   ```

2. **Add to your MCP client configuration**

3. **Start using in your conversations:**
   - Ask for country information
   - Search for cities
   - Export data in different formats
   - Compare locations
   - Get geographic statistics

## 📈 Performance Notes

- **City queries**: Limited to prevent overwhelming responses (default: 1000 cities)
- **Export formats**: JSON, CSV, XML, YAML supported
- **Search**: Case-insensitive partial matching
- **Response size**: Automatically truncated for large datasets

## 🤝 Contributing

Contributions are welcome! Please visit our [GitHub Repository](https://github.com/tansuasici/CountryStateCity).

## 📄 License

MIT License - see [LICENSE](https://github.com/tansuasici/CountryStateCity/blob/main/LICENSE) for details.

## 👨‍💻 Author

**Tansu Asici**
- Website: [tansuasici.com](https://tansuasici.com)
- GitHub: [@tansuasici](https://github.com/tansuasici)

## 🔗 Related Links

- [NPM Package](https://www.npmjs.com/package/@tansuasici/country-state-city-mcp)
- [Main Library](https://www.npmjs.com/package/@tansuasici/country-state-city)
- [GitHub Repository](https://github.com/tansuasici/CountryStateCity)
- [Live Demo](https://countrystatecity.xyz)
- [MCP Protocol Docs](https://modelcontextprotocol.io)

## 📝 Changelog

### v1.0.1 (2024-12-31)
- Added missing dependencies (js-yaml, xml-js)
- Improved documentation with examples
- Enhanced error handling

### v1.0.0 (2024-12-31)
- Initial release
- 23 tools for location data access
- Support for JSON, CSV, XML, YAML formats
- Complete MCP protocol implementation