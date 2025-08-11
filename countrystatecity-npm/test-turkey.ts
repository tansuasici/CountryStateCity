import { CountryStateCity, Country, State, City } from './src/index';

console.log('🇹🇷 Türkiye Şehir Verilerini Test Ediyoruz (TypeScript)...\n');
console.log('='.repeat(50));

// 1. Türkiye'yi bul
console.log('\n1. TÜRKİYE VERİSİNİ BULMA:');
const turkey: Country | undefined = CountryStateCity.getCountryByIso2('TR');

if (turkey) {
    console.log('✅ Türkiye bulundu!');
    console.log('- ID:', turkey.id);
    console.log('- İsim:', turkey.name);
    console.log('- ISO2:', turkey.iso2);
    console.log('- ISO3:', turkey.iso3);
    console.log('- Başkent:', turkey.capital);
    console.log('- Para Birimi:', turkey.currency);
    console.log('- Telefon Kodu:', turkey.phoneCode);
    console.log('- Emoji:', turkey.emoji);
    
    // 2. Türkiye'nin şehirlerini (states) getir
    console.log('\n2. TÜRKİYE ŞEHİRLERİ (STATES):');
    console.log('-'.repeat(30));
    
    const turkeyStates: State[] | string = CountryStateCity.getStatesByCountryId(turkey.id);
    
    if (Array.isArray(turkeyStates)) {
        console.log(`Toplam ${turkeyStates.length} şehir bulundu`);
        
        // İlk 10 şehri listele
        console.log('\nİlk 10 şehir:');
        turkeyStates.slice(0, 10).forEach((state: State, index: number) => {
            console.log(`${index + 1}. ${state.name} (ID: ${state.id}, Code: ${state.stateCode})`);
        });
        
        // Önemli şehirleri bul
        console.log('\n3. ÖNEMLİ ŞEHİRLERİ BULMA:');
        console.log('-'.repeat(30));
        
        interface CityInfo {
            name: string;
            found: boolean;
            state?: State;
        }
        
        const importantCities: string[] = ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'];
        const cityResults: CityInfo[] = importantCities.map(cityName => {
            const city = turkeyStates.find((s: State) => s.name === cityName);
            return {
                name: cityName,
                found: !!city,
                state: city
            };
        });
        
        cityResults.forEach((result: CityInfo) => {
            if (result.found && result.state) {
                console.log(`✅ ${result.name} - ID: ${result.state.id}, Code: ${result.state.stateCode}`);
            } else {
                console.log(`❌ ${result.name} bulunamadı`);
            }
        });
        
        // 4. İstanbul'un ilçelerini (cities) getir
        console.log('\n4. İSTANBUL İLÇELERİ:');
        console.log('-'.repeat(30));
        
        const istanbul: State | undefined = turkeyStates.find((s: State) => s.name === 'Istanbul');
        
        if (istanbul) {
            const istanbulCitiesData = CountryStateCity.getCitiesByStateId(istanbul.id);
            
            if (Array.isArray(istanbulCitiesData)) {
                const istanbulCities: City[] = istanbulCitiesData;
                console.log(`İstanbul'da ${istanbulCities.length} ilçe/bölge bulundu`);
                
                console.log('\nİlk 15 ilçe:');
                istanbulCities.slice(0, 15).forEach((city: City, index: number) => {
                    console.log(`${index + 1}. ${city.name}`);
                });
                
                // Bilinen ilçeleri kontrol et
                console.log('\nBilinen ilçeleri arama:');
                const knownDistricts: string[] = ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Fatih', 'Bakırköy'];
                
                knownDistricts.forEach((district: string) => {
                    const found = istanbulCities.find((c: City) => c.name.includes(district));
                    if (found) {
                        console.log(`✅ ${district} bulundu: ${found.name}`);
                    } else {
                        console.log(`❌ ${district} bulunamadı`);
                    }
                });
            }
        }
        
        // 5. Ankara'nın ilçelerini getir
        console.log('\n5. ANKARA İLÇELERİ:');
        console.log('-'.repeat(30));
        
        const ankara: State | undefined = turkeyStates.find((s: State) => s.name === 'Ankara');
        
        if (ankara) {
            const ankaraCitiesData = CountryStateCity.getCitiesByStateId(ankara.id);
            
            if (Array.isArray(ankaraCitiesData)) {
                const ankaraCities: City[] = ankaraCitiesData;
                console.log(`Ankara'da ${ankaraCities.length} ilçe/bölge bulundu`);
                
                console.log('\nİlk 10 ilçe:');
                ankaraCities.slice(0, 10).forEach((city: City, index: number) => {
                    console.log(`${index + 1}. ${city.name}`);
                });
            }
        }
        
        // 6. Türkiye'deki tüm şehirleri arama
        console.log('\n6. TÜRKİYE GENELİNDE ŞEHİR ARAMA:');
        console.log('-'.repeat(30));
        
        const searchTerms: string[] = ['Istanbul', 'Ankara', 'Izmir'];
        searchTerms.forEach((term: string) => {
            const results: City[] = CountryStateCity.searchCities(term, undefined, turkey.id);
            console.log(`"${term}" araması: ${results.length} sonuç bulundu`);
            if (results.length > 0) {
                console.log(`  İlk sonuç: ${results[0].name}, ${results[0].stateName}`);
            }
        });
        
        // 7. Veri formatlarını test et
        console.log('\n7. VERİ FORMATLARI:');
        console.log('-'.repeat(30));
        
        // JSON formatı (pretty)
        const jsonStates = CountryStateCity.getStatesByCountryId(turkey.id, 'json', { pretty: true });
        if (typeof jsonStates === 'string') {
            const parsed = JSON.parse(jsonStates);
            console.log('✅ JSON format (pretty):', Array.isArray(parsed) ? `${parsed.length} kayıt` : 'Veri alındı');
        }
        
        // CSV formatı
        const csvStates = CountryStateCity.getStatesByCountryId(turkey.id, 'csv');
        if (typeof csvStates === 'string') {
            const csvLines = csvStates.split('\n');
            console.log('✅ CSV format:', csvLines.length, 'satır');
            console.log('   İlk satır (başlıklar):', csvLines[0].substring(0, 100));
        }
        
        // XML formatı
        const xmlStates = CountryStateCity.getStatesByCountryId(turkey.id, 'xml');
        if (typeof xmlStates === 'string') {
            console.log('✅ XML format:', xmlStates.substring(0, 100) + '...');
        }
        
        // YAML formatı
        const yamlStates = CountryStateCity.getStatesByCountryId(turkey.id, 'yaml');
        if (typeof yamlStates === 'string') {
            console.log('✅ YAML format:', yamlStates.substring(0, 100) + '...');
        }
        
        // ÖZET
        console.log('\n' + '='.repeat(50));
        console.log('📊 ÖZET:');
        console.log(`- Türkiye ID: ${turkey.id}`);
        console.log(`- Türkiye ISO Kodları: ${turkey.iso2} / ${turkey.iso3}`);
        console.log(`- Toplam İl Sayısı: ${turkeyStates.length}`);
        
        if (istanbul) {
            const istData = CountryStateCity.getCitiesByStateId(istanbul.id);
            if (Array.isArray(istData)) {
                console.log(`- İstanbul'daki ilçe sayısı: ${istData.length}`);
            }
        }
        
        if (ankara) {
            const ankData = CountryStateCity.getCitiesByStateId(ankara.id);
            if (Array.isArray(ankData)) {
                console.log(`- Ankara'daki ilçe sayısı: ${ankData.length}`);
            }
        }
    }
    
} else {
    console.log('❌ Türkiye bulunamadı!');
}

console.log('\n' + '='.repeat(50));
console.log('TEST TAMAMLANDI!');
console.log('='.repeat(50));

// TypeScript-specific: Type checking examples
console.log('\n📝 TYPE CHECKING ÖRNEKLERİ:');

// Fonksiyon ile tip güvenliği
function getCountryInfo(iso2: string): string {
    const country: Country | undefined = CountryStateCity.getCountryByIso2(iso2);
    if (country) {
        return `${country.emoji} ${country.name} (${country.capital})`;
    }
    return 'Ülke bulunamadı';
}

console.log('TR:', getCountryInfo('TR'));
console.log('US:', getCountryInfo('US'));
console.log('GB:', getCountryInfo('GB'));

// Interface kullanımı
interface LocationData {
    country: Country;
    states: State[];
    totalCities: number;
}

function getLocationData(countryIso2: string): LocationData | null {
    const country = CountryStateCity.getCountryByIso2(countryIso2);
    if (!country) return null;
    
    const statesData = CountryStateCity.getStatesByCountryId(country.id);
    if (!Array.isArray(statesData)) return null;
    
    const states: State[] = statesData;
    let totalCities = 0;
    
    states.forEach(state => {
        const citiesData = CountryStateCity.getCitiesByStateId(state.id);
        if (Array.isArray(citiesData)) {
            totalCities += citiesData.length;
        }
    });
    
    return {
        country,
        states,
        totalCities
    };
}

const turkeyData = getLocationData('TR');
if (turkeyData) {
    console.log(`\n${turkeyData.country.name} Detaylı Bilgi:`);
    console.log(`- ${turkeyData.states.length} il`);
    console.log(`- ${turkeyData.totalCities} toplam yerleşim`);
}