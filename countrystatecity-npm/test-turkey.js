const { CountryStateCity } = require('./dist/index.js');

console.log('Türkiye Şehir Verilerini Test Ediyoruz...\n');
console.log('='.repeat(50));

// 1. Türkiye'yi bul
console.log('\n1. TÜRKİYE VERİSİNİ BULMA:');
const turkey = CountryStateCity.getCountryByIso2('TR');
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
} else {
    console.log('❌ Türkiye bulunamadı!');
}

// 2. Türkiye'nin şehirlerini (states) getir
console.log('\n2. TÜRKİYE ŞEHİRLERİ (STATES):');
console.log('-'.repeat(30));
const turkeyStates = CountryStateCity.getStatesByCountryId(turkey.id);
console.log(`Toplam ${turkeyStates.length} şehir bulundu`);

// İlk 10 şehri listele
console.log('\nİlk 10 şehir:');
turkeyStates.slice(0, 10).forEach((state, index) => {
    console.log(`${index + 1}. ${state.name} (ID: ${state.id}, Code: ${state.stateCode})`);
});

// Önemli şehirleri bul
console.log('\n3. ÖNEMLİ ŞEHİRLERİ BULMA:');
console.log('-'.repeat(30));
const importantCities = ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'];
importantCities.forEach(cityName => {
    const city = turkeyStates.find(s => s.name === cityName);
    if (city) {
        console.log(`✅ ${cityName} - ID: ${city.id}, Code: ${city.stateCode}`);
    } else {
        console.log(`❌ ${cityName} bulunamadı`);
    }
});

// 4. İstanbul'un ilçelerini (cities) getir
console.log('\n4. İSTANBUL İLÇELERİ:');
console.log('-'.repeat(30));
const istanbul = turkeyStates.find(s => s.name === 'Istanbul');
if (istanbul) {
    const istanbulCities = CountryStateCity.getCitiesByStateId(istanbul.id);
    console.log(`İstanbul'da ${istanbulCities.length} ilçe/bölge bulundu`);
    
    console.log('\nİlk 15 ilçe:');
    istanbulCities.slice(0, 15).forEach((city, index) => {
        console.log(`${index + 1}. ${city.name}`);
    });
    
    // Bilinen ilçeleri kontrol et
    console.log('\nBilinen ilçeleri arama:');
    const knownDistricts = ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Fatih', 'Bakırköy'];
    knownDistricts.forEach(district => {
        const found = istanbulCities.find(c => c.name.includes(district));
        if (found) {
            console.log(`✅ ${district} bulundu: ${found.name}`);
        } else {
            console.log(`❌ ${district} bulunamadı`);
        }
    });
}

// 5. Ankara'nın ilçelerini getir
console.log('\n5. ANKARA İLÇELERİ:');
console.log('-'.repeat(30));
const ankara = turkeyStates.find(s => s.name === 'Ankara');
if (ankara) {
    const ankaraCities = CountryStateCity.getCitiesByStateId(ankara.id);
    console.log(`Ankara'da ${ankaraCities.length} ilçe/bölge bulundu`);
    
    console.log('\nİlk 10 ilçe:');
    ankaraCities.slice(0, 10).forEach((city, index) => {
        console.log(`${index + 1}. ${city.name}`);
    });
}

// 6. Türkiye'deki tüm şehirleri arama
console.log('\n6. TÜRKİYE GENELİNDE ŞEHİR ARAMA:');
console.log('-'.repeat(30));
const searchTerms = ['Istanbul', 'Ankara', 'Izmir'];
searchTerms.forEach(term => {
    const results = CountryStateCity.searchCities(term, null, turkey.id);
    console.log(`"${term}" araması: ${results.length} sonuç bulundu`);
    if (results.length > 0) {
        console.log(`  İlk sonuç: ${results[0].name}, ${results[0].stateName}`);
    }
});

// 7. Veri formatlarını test et
console.log('\n7. VERİ FORMATLARI:');
console.log('-'.repeat(30));

// JSON formatı (varsayılan)
const jsonStates = CountryStateCity.getStatesByCountryId(turkey.id, 'json');
console.log('✅ JSON format:', typeof jsonStates === 'string' ? 'String olarak alındı' : `${jsonStates.length} kayıt`);

// CSV formatı
const csvStates = CountryStateCity.getStatesByCountryId(turkey.id, 'csv');
const csvLines = csvStates.split('\n');
console.log('✅ CSV format:', csvLines.length, 'satır');
console.log('   İlk satır (başlıklar):', csvLines[0]);

// XML formatı
const xmlStates = CountryStateCity.getStatesByCountryId(turkey.id, 'xml');
console.log('✅ XML format:', xmlStates.substring(0, 100) + '...');

// YAML formatı
const yamlStates = CountryStateCity.getStatesByCountryId(turkey.id, 'yaml');
console.log('✅ YAML format:', yamlStates.substring(0, 100) + '...');

console.log('\n' + '='.repeat(50));
console.log('TEST TAMAMLANDI!');
console.log('='.repeat(50));

// ÖZET
console.log('\n📊 ÖZET:');
console.log(`- Türkiye ID: ${turkey.id}`);
console.log(`- Toplam İl Sayısı: ${turkeyStates.length}`);
console.log(`- İstanbul'daki ilçe sayısı: ${istanbul ? CountryStateCity.getCitiesByStateId(istanbul.id).length : 'N/A'}`);
console.log(`- Ankara'daki ilçe sayısı: ${ankara ? CountryStateCity.getCitiesByStateId(ankara.id).length : 'N/A'}`);