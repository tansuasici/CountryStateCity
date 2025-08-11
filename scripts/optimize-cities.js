const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

console.log('🔄 Starting city data optimization...\n');

// Read original data
const citiesPath = path.join(__dirname, '../data/city.json');
const statesPath = path.join(__dirname, '../data/state.json');
const countriesPath = path.join(__dirname, '../data/country.json');

const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf-8'));
const states = JSON.parse(fs.readFileSync(statesPath, 'utf-8'));
const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf-8'));

// Original size
const originalSize = fs.statSync(citiesPath).size;
console.log(`📊 Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`📊 Total cities: ${cities.length}\n`);

// Strategy 1: Remove redundant fields and shorten keys
console.log('📦 Strategy 1: Removing redundant fields...');
const optimizedCities = cities.map(city => ({
  i: city.id,                     // id
  n: city.name,                    // name
  s: city.stateId,                 // stateId
  c: city.countryId,              // countryId
  la: parseFloat(parseFloat(city.latitude).toFixed(4)),   // latitude (4 decimals)
  lo: parseFloat(parseFloat(city.longitude).toFixed(4)),  // longitude (4 decimals)
  w: city.wikiDataId === 'Q' || !city.wikiDataId ? null : city.wikiDataId  // wikiDataId (only if valid)
})).map(city => {
  // Remove null wikiDataId to save more space
  if (city.w === null) {
    delete city.w;
  }
  return city;
});

// Save optimized version
const optimizedPath = path.join(__dirname, '../data/city-optimized.json');
fs.writeFileSync(optimizedPath, JSON.stringify(optimizedCities));
const optimizedSize = fs.statSync(optimizedPath).size;
console.log(`✅ Optimized size: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`💰 Saved: ${((1 - optimizedSize/originalSize) * 100).toFixed(1)}%\n`);

// Strategy 2: Create array format for maximum compression
console.log('📦 Strategy 2: Converting to array format...');
const arrayFormat = optimizedCities.map(city => [
  city.i,
  city.n,
  city.s,
  city.c,
  city.la,
  city.lo,
  city.w || ''
]);

const arrayPath = path.join(__dirname, '../data/city-array.json');
fs.writeFileSync(arrayPath, JSON.stringify(arrayFormat));
const arraySize = fs.statSync(arrayPath).size;
console.log(`✅ Array format size: ${(arraySize / 1024 / 1024).toFixed(2)} MB`);
console.log(`💰 Saved: ${((1 - arraySize/originalSize) * 100).toFixed(1)}%\n`);

// Strategy 3: Split by country
console.log('📦 Strategy 3: Splitting by country...');
const citiesByCountry = {};
let totalSplitSize = 0;

// Group cities by country
cities.forEach(city => {
  const countryCode = city.countryCode.toLowerCase();
  if (!citiesByCountry[countryCode]) {
    citiesByCountry[countryCode] = [];
  }
  
  // Use optimized format
  citiesByCountry[countryCode].push({
    i: city.id,
    n: city.name,
    s: city.stateId,
    la: parseFloat(parseFloat(city.latitude).toFixed(4)),
    lo: parseFloat(parseFloat(city.longitude).toFixed(4))
  });
});

// Create cities directory
const citiesDir = path.join(__dirname, '../data/cities');
if (!fs.existsSync(citiesDir)) {
  fs.mkdirSync(citiesDir, { recursive: true });
}

// Save each country's cities
const countryIndex = {};
Object.keys(citiesByCountry).forEach(countryCode => {
  const countryData = citiesByCountry[countryCode];
  const filePath = path.join(citiesDir, `${countryCode}.json`);
  fs.writeFileSync(filePath, JSON.stringify(countryData));
  const fileSize = fs.statSync(filePath).size;
  totalSplitSize += fileSize;
  
  // Add to index
  const country = countries.find(c => c.iso2.toLowerCase() === countryCode);
  if (country) {
    countryIndex[country.id] = {
      code: countryCode,
      count: countryData.length,
      size: fileSize
    };
  }
});

// Save country index
const indexPath = path.join(citiesDir, 'index.json');
fs.writeFileSync(indexPath, JSON.stringify(countryIndex));

console.log(`✅ Split into ${Object.keys(citiesByCountry).length} country files`);
console.log(`✅ Total split size: ${(totalSplitSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`💰 Average file size: ${(totalSplitSize / Object.keys(citiesByCountry).length / 1024).toFixed(1)} KB\n`);

// Strategy 4: Create popular cities subset
console.log('📦 Strategy 4: Creating popular cities subset...');

// Define popular cities (you can expand this list)
const popularCityNames = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego',
  'London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Edinburgh',
  'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana',
  'Tokyo', 'Osaka', 'Kyoto', 'Yokohama',
  'Paris', 'Marseille', 'Lyon', 'Nice',
  'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt',
  'Madrid', 'Barcelona', 'Valencia', 'Seville',
  'Rome', 'Milan', 'Naples', 'Turin',
  'Moscow', 'Saint Petersburg',
  'Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen',
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Sydney', 'Melbourne', 'Brisbane', 'Perth',
  'Toronto', 'Montreal', 'Vancouver', 'Calgary',
  'Mexico City', 'Guadalajara', 'Monterrey',
  'São Paulo', 'Rio de Janeiro', 'Brasília',
  'Buenos Aires', 'Lima', 'Bogotá', 'Santiago'
];

const popularCities = cities
  .filter(city => popularCityNames.some(name => city.name.includes(name)))
  .map(city => ({
    i: city.id,
    n: city.name,
    s: city.stateId,
    c: city.countryId,
    sn: city.stateName,
    cn: city.countryName,
    la: parseFloat(parseFloat(city.latitude).toFixed(4)),
    lo: parseFloat(parseFloat(city.longitude).toFixed(4))
  }));

const popularPath = path.join(__dirname, '../data/cities-popular.json');
fs.writeFileSync(popularPath, JSON.stringify(popularCities));
const popularSize = fs.statSync(popularPath).size;
console.log(`✅ Popular cities: ${popularCities.length}`);
console.log(`✅ Popular cities size: ${(popularSize / 1024).toFixed(1)} KB\n`);

// Strategy 5: Compress with gzip
console.log('📦 Strategy 5: Applying gzip compression...');

const compressFile = (inputPath, outputPath) => {
  const input = fs.readFileSync(inputPath);
  const compressed = zlib.gzipSync(input, { level: 9 });
  fs.writeFileSync(outputPath, compressed);
  return compressed.length;
};

// Compress optimized version
const compressedSize = compressFile(
  optimizedPath,
  path.join(__dirname, '../data/city-optimized.json.gz')
);

console.log(`✅ Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`💰 Saved vs original: ${((1 - compressedSize/originalSize) * 100).toFixed(1)}%\n`);

// Final report
console.log('📊 FINAL REPORT:');
console.log('='.repeat(50));
console.log(`Original:        ${(originalSize / 1024 / 1024).toFixed(2)} MB (100%)`);
console.log(`Optimized:       ${(optimizedSize / 1024 / 1024).toFixed(2)} MB (${((optimizedSize/originalSize) * 100).toFixed(1)}%)`);
console.log(`Array format:    ${(arraySize / 1024 / 1024).toFixed(2)} MB (${((arraySize/originalSize) * 100).toFixed(1)}%)`);
console.log(`Compressed:      ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${((compressedSize/originalSize) * 100).toFixed(1)}%)`);
console.log(`Popular subset:  ${(popularSize / 1024).toFixed(1)} KB`);
console.log('='.repeat(50));

// Create a mapping file for the optimized format
const mapping = {
  format: 'optimized-v1',
  description: 'Optimized city data format',
  fields: {
    i: 'id',
    n: 'name',
    s: 'stateId',
    c: 'countryId',
    la: 'latitude',
    lo: 'longitude',
    w: 'wikiDataId (optional)'
  },
  arrayFormat: {
    0: 'id',
    1: 'name',
    2: 'stateId',
    3: 'countryId',
    4: 'latitude',
    5: 'longitude',
    6: 'wikiDataId (optional)'
  }
};

fs.writeFileSync(
  path.join(__dirname, '../data/city-format.json'),
  JSON.stringify(mapping, null, 2)
);

console.log('\n✅ Optimization complete!');
console.log('📝 Format mapping saved to city-format.json');
console.log('\n🎯 Recommended approach:');
console.log('  1. Use city-optimized.json for general use (60% smaller)');
console.log('  2. Use cities/<country>.json for lazy loading');
console.log('  3. Use cities-popular.json for quick access to major cities');
console.log('  4. Use .gz files for network transfer');