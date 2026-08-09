#!/usr/bin/env python3
"""Create the reviewable CountryStateCity audit notebook."""

from pathlib import Path

import nbformat as nbf


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "analysis" / "country_state_city_data_quality.ipynb"


def markdown(text: str):
    return nbf.v4.new_markdown_cell(text.strip())


def code(text: str):
    return nbf.v4.new_code_cell(text.strip())


notebook = nbf.v4.new_notebook()
notebook["metadata"] = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python", "version": "3"},
}
notebook["cells"] = [
    markdown("""
# CountryStateCity veri kalite denetimi

Tam yerel veri setini satır bazında tarayan, dış kaynak ve canlı ürün kontrollerinin kanıt özetini taşıyan tekrar çalıştırılabilir denetim defteri. Snapshot tarihi: **5 Ağustos 2026**.
"""),
    markdown("""
## tl;dr

Veri seti yüklenebilir; primary key ve foreign key bütünlüğü korunuyor. Display normalizasyonu 250 ülkenin tamamını, 4.963 subdivision'ın tamamını ve 147.739 place kaydının tamamını işler. Buna karşın canonical production snapshot güncel kaynaktan geride: 476 yerel subdivision kodu güncel kaynakta yok, güncel kaynaktaki 821 subdivision kodu yerel veride yok. Place şemasında entity type bulunmadığı için yalnızca adda açıkça yazan 3.801 idarî tür güvenle ayrılabilir.
"""),
    markdown("""
## Context & Methods

- Yerel `country.json`, `state.json`, `city.json` ve optimized city dosyalarının tamamı işlendi; örneklem kullanılmadı.
- ID benzersizliği, orphan foreign key, denormalize parent parity, coverage/null, QID, type/translation schema, timezone ve optimized parity kontrolleri yapıldı.
- Güncel upstream snapshot, ISO ve Natural Earth kontrolleri ayrı kaynaklarla yapıldı; siyasi sınır ve küçük ada genelleştirmeleri coğrafi outlier sonuçlarında caveat olarak tutuldu.
- Yerel Türkiye RAR arşivi yalnızca teknik uygunluk açısından incelendi; lisans/source belirsizliği nedeniyle authoritative kabul edilmedi.
"""),
    code("""
from pathlib import Path
import json, sys
import pandas as pd
import matplotlib.pyplot as plt

repo = Path.cwd()
if not (repo / "data" / "country.json").exists():
    repo = Path.cwd().parent
sys.path.insert(0, str(repo / "analysis"))
from data_quality_audit import audit

result = audit(repo)
result["scope"]
"""),
    markdown("""
## Data

Yerel canonical görünen dört JSON dosyası ile bunların npm/optimized/shard türevleri incelendi. Dış benchmark, upstream master commit `0fc88a640175d0950512a370e35a61d14936d0d0`; spatial benchmark Natural Earth 1:10m Admin-0 katmanıdır.
"""),
    code("""
pd.DataFrame([
    {"katman": "Country", "yerel_satır": result["scope"]["countries"]},
    {"katman": "State", "yerel_satır": result["scope"]["states"]},
    {"katman": "City", "yerel_satır": result["scope"]["cities"]},
    {"katman": "Optimized city", "yerel_satır": result["scope"]["optimizedCities"]},
])
"""),
    markdown("""
## Results

### Kimlik ve referential integrity

Country/state/city ID'leri benzersiz, exact duplicate city ve orphan foreign key yoktur. Denormalize parent alanlarında toplam 617 mismatch vardır.
"""),
    code("""
identity_rows = []
for duplicate_id, rows in result["identity"]["duplicateCityIds"].items():
    for row in rows:
        identity_rows.append({"duplicate_city_id": duplicate_id, **row})
pd.DataFrame(identity_rows)
"""),
    code("""
mismatch = pd.DataFrame([
    {"alan": key, "uyuşmazlık": value}
    for key, value in result["referentialIntegrity"]["cityDenormalizedMismatchByField"].items()
]).sort_values("uyuşmazlık", ascending=True)

ax = mismatch.plot.barh(x="alan", y="uyuşmazlık", legend=False, color="#c2413b", figsize=(7, 3.5))
ax.set_title("City denormalize parent alanı uyuşmazlıkları")
ax.set_xlabel("Satır sayısı")
ax.set_ylabel("")
for container in ax.containers:
    ax.bar_label(container)
plt.tight_layout()
plt.show()
"""),
    markdown("""
### Kapsama ve şema

Null tek başına hata değildir; yine de ürünün “complete” iddiası için `missing`, `unknown` ve `notApplicable` ayrımı gerekir. State satırlarının %86,08'inde type yoktur; state/city tabloları farklı idari seviyeleri birlikte taşır.
"""),
    code("""
coverage = pd.DataFrame([
    {"kontrol": "Country without state", "adet": result["coverage"]["countriesWithoutStates"], "payda": result["scope"]["countries"]},
    {"kontrol": "Country without city", "adet": result["coverage"]["countriesWithoutCities"], "payda": result["scope"]["countries"]},
    {"kontrol": "State without city", "adet": result["coverage"]["statesWithoutCities"], "payda": result["scope"]["states"]},
    {"kontrol": "State without coordinates", "adet": result["coverage"]["statesWithoutCoordinates"], "payda": result["scope"]["states"]},
])
coverage["oran_%"] = (100 * coverage["adet"] / coverage["payda"]).round(2)
coverage
"""),
    markdown("""
### Adlandırma ve idarî türler

Ham adlar export/round-trip uyumluluğu için korunmuştur. UI adlandırma katmanı, pinned `v3.2-export.7` subdivision metadata'sını `countryCode-stateCode` anahtarıyla eşleştirir; eşleşmeyen kayıtlarda yalnızca açık bir ad son ekinden tür çıkarır ve hiçbir zaman genel “Administrative area” etiketi uydurmaz.

- 250 ülkenin tamamı İngilizce ECMA-402/CLDR display adıyla kapsanır; 36 ad değişir.
- 4.487/4.963 yerel subdivision güncel metadata ile kod üzerinden doğrulanır.
- 2.632 subdivision adı UI'da category tekrarını kaldıran kısa biçime dönüşür.
- Subdivision tür kapsaması 691'den 4.798'e çıkar; 165 kayıt bilinçli olarak etiketsiz bırakılır.
- 476 yerel subdivision güncel kaynakta yok; güncel kaynaktaki 821 kod production snapshot'ta yok.
- 147.739 place kaydının tamamı normalize edilir; 3.801 açık idarî son ek ayrılır ve toplam 3.814 display adı değişir.
- Kalan 143.938 place kaydında entity type olmadığı için “City/Town/Village” etiketi doğrulanabilir değildir.
"""),
    code("""
pd.DataFrame({
    "country": result["naming"]["countryDisplay"],
    "subdivision": result["naming"]["displayMetadata"],
    "place": result["naming"]["cityEntityType"],
}).T
"""),
    markdown("""
### Wikidata ve koordinat güveni

- 19.880 QID birden fazla city kaydında kullanılmış; 58.833 satır etkileniyor.
- 17.520 duplicate-QID grubu farklı state'lere, 45'i farklı ülkelere yayılıyor; en yüksek multiplicity 115.
- Natural Earth kontrolünde 318 state merkezi ülke sınırından 25 km'den fazla uzakta; 303'ü 100 km'den fazla. Isabela/Philippines→Puerto Rico ve Bel Air/Seychelles→Los Angeles gibi belirgin yanlış geocoding örnekleri var.
- City outlier'larının önemli bir kısmı Crimea/Ukraine ve Puerto Rico/US gibi territory modelinden kaynaklandığından otomatik “hata” sayılmamalı.
"""),
    code("""
pd.DataFrame([result["wikidata"]]).T.rename(columns={0: "değer"})
"""),
    markdown("""
### Güncellik ve upstream farkı

5 Ağustos 2026 karşılaştırma snapshot'ı:

| Katman | Yerel | Upstream current | Local-only ID | Upstream-only ID | Ortak ID'de değişen |
|---|---:|---:|---:|---:|---:|
| Country | 250 | 250 | — | — | 56 shared-field değişimi |
| State | 4.963 | 5.308 | 399 | 744 | 4.532 |
| City | 147.739 | 152.970 | 7.389 | 12.620 | 68.960 |

Upstream ID'leri immutable değildir; city ID 11'in farklı entity'ye atanmış olması kör senkronizasyonu tehlikeli kılar. Güncel upstream de mutlak doğruluk kaynağı değil, yalnızca versioned comparison baseline'dır.
"""),
    markdown("""
### Türkiye arşivi

`turkiye-mulki-idare-sinirlari-2083.rar` teknik olarak değerlidir fakat doğrudan kullanıma hazır değildir. 922 ilçe ve 81 il/başkent merkezi; 445 il ve 2.499 ilçe boundary polyline parçası içerir. Ad/kod attribute'u ve lisans/source belgesi yoktur. Deneme polygonization 81 il fakat yalnızca 917/922 ilçe zone'u üretti; bazı komşu ilçeler birleşik kaldı ve sliver/dangle yüzler oluştu.
"""),
    markdown("""
### Ürün, paket ve bağımlılıklar

- Canlı `/map` ve `/docs*` rotaları 404; sitemap kırık rotaları yayınlıyor. Canlı site v2.0.14, repo v2.0.15.
- Paket yaklaşık 14,0 MB sıkıştırılmış / 124,1 MB unpacked; city verisi birden çok formatta tekrar ediyor.
- Next.js kurulu 16.2.6, npm latest 16.3.0. `npm audit`: 18 açık (1 critical, 10 high, 3 moderate, 4 low).
- Testler 231 pass / 39 skip; adlandırma ve display metadata kalite kapıları test kapsamına eklendi.
"""),
    markdown("""
## Takeaways

1. UI'da canonical adı koruyan verified display-name/type katmanı kullanılmalı; genel idarî tür etiketleri kaldırılmalı.
2. Production snapshot, immutable ID migration tamamlandıktan sonra pinned güncel kaynağa taşınmalı.
3. QID, state koordinatları, city entity-grain ve coverage borcu bu pipeline üzerinden temizlenmeli.
4. Türkiye polygon işi lisans doğrulaması ve topoloji tamiri sonrası pilot ürün olarak değerlendirilebilir.

Detaylı uygulama işleri Linear projesinde Todo durumunda ayrı issue'lara bölünmüştür.
"""),
]

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
nbf.write(notebook, OUTPUT)
print(OUTPUT)
