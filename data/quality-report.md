# Data quality release gate

Status: **PASS**

Data version: `sha256:753742bdb65d7ff73082fce925b75ab6228efb217f0226a9d87bad5ef5556c74`

Records: 250 countries, 4963 states, 147739 cities, 922 districts.

## Checks

| Check | Severity | Status | Observed | Excepted | Unresolved |
| --- | --- | --- | ---: | ---: | ---: |
| Required schema fields are populated | critical | PASSED | 0 | 0 | 0 |
| Public numeric IDs are unique per entity | critical | PASSED | 0 | 0 | 0 |
| Every parent reference resolves | critical | PASSED | 0 | 0 | 0 |
| Denormalized parent fields match canonical parents | high | PASSED | 0 | 0 | 0 |
| Normalized names are unique within a parent unless reviewed | high | PASSED | 2 | 2 | 0 |
| Coordinates are paired and within WGS84 ranges | critical | PASSED | 0 | 0 | 0 |
| Every null or coverage gap is classified | high | PASSED | 0 | 0 | 0 |
| Published supplemental QIDs are valid, unique, and verified | high | PASSED | 0 | 0 | 0 |
| Timezone IDs and observed static offsets are valid | high | PASSED | 0 | 0 | 0 |
| Country polygon outliers are corrected or explicitly classified | high | PASSED | 632 | 632 | 0 |
| State coordinates are verified, derived, or explicitly excepted | high | PASSED | 51 | 51 | 0 |
| Raw, optimized, shard, npm, and manifest artifacts match by hash | critical | PASSED | 0 | 0 | 0 |
| Exceptions have an owner, rationale, evidence, and future expiry | high | PASSED | 0 | 0 | 0 |

## Managed exceptions

| Exception | Check | Count | Owner | Expires |
| --- | --- | ---: | --- | --- |
| normalized-state-name-taiwan-city-county-pairs | normalized-duplicates | 2 | data-maintainers | 2027-02-08 |
| city-country-polygon-reviewed-exceptions | country-polygon-outliers | 632 | data-maintainers | 2027-02-08 |
| state-coordinate-reviewed-exceptions | state-coordinate-outliers | 51 | data-maintainers | 2027-02-08 |

## Country drill-down

| Country | States | Cities | Coverage gaps | State coordinate exceptions | Low-confidence QIDs |
| --- | ---: | ---: | ---: | ---: | ---: |
| AF — Afghanistan | 33 | 92 | 0 | 0 | 0 |
| AX — Aland Islands | 0 | 0 | 2 | 0 | 0 |
| AL — Albania | 47 | 130 | 0 | 1 | 0 |
| DZ — Algeria | 58 | 293 | 0 | 0 | 0 |
| AS — American Samoa | 0 | 0 | 2 | 0 | 0 |
| AD — Andorra | 7 | 10 | 0 | 0 | 0 |
| AO — Angola | 17 | 48 | 0 | 0 | 1 |
| AI — Anguilla | 0 | 0 | 2 | 0 | 0 |
| AQ — Antarctica | 0 | 0 | 4 | 0 | 0 |
| AG — Antigua And Barbuda | 8 | 9 | 0 | 0 | 0 |
| AR — Argentina | 24 | 963 | 0 | 0 | 40 |
| AM — Armenia | 11 | 308 | 0 | 0 | 1 |
| AW — Aruba | 0 | 0 | 2 | 0 | 0 |
| AU — Australia | 8 | 4139 | 0 | 0 | 88 |
| AT — Austria | 9 | 2361 | 0 | 0 | 1 |
| AZ — Azerbaijan | 75 | 178 | 0 | 0 | 1 |
| BS — Bahamas | 42 | 21 | 0 | 5 | 0 |
| BH — Bahrain | 5 | 9 | 0 | 0 | 0 |
| BD — Bangladesh | 70 | 141 | 0 | 0 | 1 |
| BB — Barbados | 11 | 7 | 0 | 0 | 0 |
| BY — Belarus | 7 | 329 | 0 | 0 | 1 |
| BE — Belgium | 13 | 550 | 0 | 0 | 2 |
| BZ — Belize | 6 | 13 | 0 | 0 | 0 |
| BJ — Benin | 12 | 36 | 0 | 0 | 0 |
| BM — Bermuda | 11 | 0 | 1 | 0 | 0 |
| BT — Bhutan | 19 | 24 | 0 | 0 | 0 |
| BO — Bolivia | 9 | 228 | 0 | 0 | 26 |
| BQ — Bonaire, Sint Eustatius and Saba | 0 | 0 | 2 | 0 | 0 |
| BA — Bosnia and Herzegovina | 13 | 232 | 0 | 0 | 0 |
| BW — Botswana | 10 | 75 | 0 | 0 | 1 |
| BV — Bouvet Island | 0 | 0 | 3 | 0 | 0 |
| BR — Brazil | 27 | 5640 | 0 | 0 | 51 |
| IO — British Indian Ocean Territory | 0 | 0 | 2 | 0 | 0 |
| BN — Brunei | 4 | 9 | 0 | 0 | 0 |
| BG — Bulgaria | 28 | 504 | 0 | 0 | 0 |
| BF — Burkina Faso | 57 | 92 | 0 | 0 | 4 |
| BI — Burundi | 18 | 17 | 0 | 0 | 0 |
| KH — Cambodia | 23 | 106 | 0 | 0 | 2 |
| CM — Cameroon | 10 | 139 | 0 | 0 | 1 |
| CA — Canada | 13 | 1079 | 0 | 0 | 9 |
| CV — Cape Verde | 23 | 24 | 0 | 0 | 0 |
| KY — Cayman Islands | 0 | 0 | 2 | 0 | 0 |
| CF — Central African Republic | 17 | 43 | 0 | 0 | 1 |
| TD — Chad | 23 | 41 | 0 | 0 | 0 |
| CL — Chile | 16 | 346 | 0 | 0 | 5 |
| CN — China | 34 | 1296 | 0 | 0 | 15 |
| CX — Christmas Island | 0 | 0 | 2 | 0 | 0 |
| CC — Cocos (Keeling) Islands | 0 | 0 | 2 | 0 | 0 |
| CO — Colombia | 33 | 1124 | 0 | 0 | 13 |
| KM — Comoros | 3 | 88 | 0 | 0 | 0 |
| CG — Congo | 12 | 17 | 0 | 0 | 0 |
| CK — Cook Islands | 0 | 0 | 2 | 0 | 0 |
| CR — Costa Rica | 7 | 159 | 0 | 0 | 3 |
| CI — Côte d'Ivoire | 31 | 85 | 0 | 1 | 0 |
| HR — Croatia | 20 | 664 | 0 | 0 | 1 |
| CU — Cuba | 16 | 187 | 0 | 0 | 0 |
| CW — Curaçao | 0 | 0 | 2 | 0 | 0 |
| CY — Cyprus | 6 | 95 | 0 | 0 | 0 |
| CZ — Czech Republic | 90 | 1355 | 0 | 0 | 1 |
| CD — Democratic Republic of the Congo | 26 | 69 | 0 | 0 | 0 |
| DK — Denmark | 5 | 429 | 0 | 0 | 0 |
| DJ — Djibouti | 6 | 12 | 0 | 0 | 0 |
| DM — Dominica | 10 | 17 | 0 | 0 | 0 |
| DO — Dominican Republic | 31 | 207 | 0 | 0 | 0 |
| TL — Timor-Leste | 12 | 50 | 0 | 0 | 0 |
| EC — Ecuador | 24 | 115 | 0 | 0 | 3 |
| EG — Egypt | 27 | 140 | 0 | 0 | 3 |
| SV — El Salvador | 14 | 100 | 0 | 0 | 0 |
| GQ — Equatorial Guinea | 9 | 24 | 0 | 0 | 1 |
| ER — Eritrea | 6 | 11 | 0 | 0 | 0 |
| EE — Estonia | 15 | 162 | 0 | 0 | 2 |
| ET — Ethiopia | 11 | 144 | 0 | 0 | 10 |
| FK — Falkland Islands | 0 | 0 | 2 | 0 | 0 |
| FO — Faroe Islands | 0 | 0 | 2 | 0 | 0 |
| FJ — Fiji Islands | 19 | 20 | 0 | 5 | 1 |
| FI — Finland | 21 | 402 | 0 | 1 | 0 |
| FR — France | 123 | 8894 | 0 | 6 | 8 |
| GF — French Guiana | 0 | 0 | 2 | 0 | 0 |
| PF — French Polynesia | 0 | 0 | 2 | 0 | 0 |
| TF — French Southern Territories | 0 | 0 | 2 | 0 | 0 |
| GA — Gabon | 9 | 28 | 0 | 0 | 0 |
| GM — Gambia | 6 | 104 | 0 | 0 | 1 |
| GE — Georgia | 14 | 112 | 0 | 0 | 1 |
| DE — Germany | 16 | 7097 | 0 | 0 | 8 |
| GH — Ghana | 16 | 121 | 0 | 0 | 21 |
| GI — Gibraltar | 0 | 0 | 2 | 0 | 0 |
| GR — Greece | 38 | 1025 | 0 | 3 | 0 |
| GL — Greenland | 0 | 0 | 2 | 0 | 0 |
| GD — Grenada | 7 | 7 | 0 | 0 | 0 |
| GP — Guadeloupe | 0 | 0 | 2 | 0 | 0 |
| GU — Guam | 0 | 0 | 2 | 0 | 0 |
| GT — Guatemala | 21 | 382 | 0 | 0 | 0 |
| GG — Guernsey and Alderney | 0 | 0 | 2 | 0 | 0 |
| GN — Guinea | 40 | 54 | 0 | 0 | 7 |
| GW — Guinea-Bissau | 11 | 14 | 0 | 1 | 0 |
| GY — Guyana | 10 | 14 | 0 | 0 | 0 |
| HT — Haiti | 10 | 124 | 0 | 0 | 0 |
| HM — Heard Island and McDonald Islands | 0 | 0 | 3 | 0 | 0 |
| HN — Honduras | 18 | 545 | 0 | 0 | 0 |
| HK — Hong Kong S.A.R. | 18 | 0 | 1 | 0 | 0 |
| HU — Hungary | 42 | 1005 | 0 | 0 | 1 |
| IS — Iceland | 8 | 74 | 0 | 0 | 5 |
| IN — India | 36 | 4241 | 0 | 0 | 104 |
| ID — Indonesia | 34 | 889 | 0 | 0 | 62 |
| IR — Iran | 31 | 1090 | 0 | 0 | 2 |
| IQ — Iraq | 18 | 81 | 0 | 0 | 0 |
| IE — Ireland | 29 | 372 | 0 | 0 | 5 |
| IL — Israel | 6 | 150 | 0 | 0 | 0 |
| IT — Italy | 128 | 9948 | 0 | 0 | 16 |
| JM — Jamaica | 14 | 840 | 0 | 0 | 0 |
| JP — Japan | 47 | 1671 | 0 | 0 | 3 |
| JE — Jersey | 0 | 0 | 2 | 0 | 0 |
| JO — Jordan | 12 | 82 | 0 | 0 | 0 |
| KZ — Kazakhstan | 17 | 260 | 0 | 0 | 5 |
| KE — Kenya | 47 | 110 | 0 | 0 | 3 |
| KI — Kiribati | 3 | 38 | 0 | 0 | 0 |
| XK — Kosovo | 7 | 0 | 1 | 0 | 0 |
| KW — Kuwait | 6 | 25 | 0 | 0 | 0 |
| KG — Kyrgyzstan | 9 | 53 | 0 | 0 | 2 |
| LA — Laos | 19 | 76 | 0 | 1 | 2 |
| LV — Latvia | 118 | 125 | 0 | 0 | 0 |
| LB — Lebanon | 8 | 26 | 0 | 0 | 0 |
| LS — Lesotho | 10 | 12 | 0 | 0 | 0 |
| LR — Liberia | 15 | 18 | 0 | 0 | 0 |
| LY — Libya | 21 | 51 | 0 | 0 | 0 |
| LI — Liechtenstein | 11 | 11 | 0 | 0 | 0 |
| LT — Lithuania | 69 | 129 | 0 | 0 | 1 |
| LU — Luxembourg | 15 | 144 | 0 | 0 | 0 |
| MO — Macau S.A.R. | 0 | 0 | 2 | 0 | 0 |
| MK — North Macedonia | 84 | 197 | 0 | 0 | 0 |
| MG — Madagascar | 6 | 9 | 0 | 0 | 0 |
| MW — Malawi | 30 | 61 | 0 | 0 | 3 |
| MY — Malaysia | 16 | 179 | 0 | 0 | 1 |
| MV — Maldives | 26 | 21 | 0 | 4 | 0 |
| ML — Mali | 11 | 47 | 0 | 0 | 3 |
| MT — Malta | 67 | 68 | 0 | 0 | 0 |
| IM — Isle of Man | 0 | 0 | 2 | 0 | 0 |
| MH — Marshall Islands | 2 | 0 | 1 | 0 | 0 |
| MQ — Martinique | 0 | 0 | 2 | 0 | 0 |
| MR — Mauritania | 15 | 15 | 0 | 0 | 0 |
| MU — Mauritius | 17 | 97 | 0 | 1 | 0 |
| YT — Mayotte | 0 | 0 | 2 | 0 | 0 |
| MX — Mexico | 32 | 9174 | 0 | 0 | 31 |
| FM — Micronesia | 4 | 81 | 0 | 0 | 0 |
| MD — Moldova | 36 | 72 | 0 | 0 | 0 |
| MC — Monaco | 3 | 0 | 1 | 0 | 0 |
| MN — Mongolia | 21 | 38 | 0 | 0 | 0 |
| ME — Montenegro | 22 | 34 | 0 | 0 | 0 |
| MS — Montserrat | 0 | 0 | 2 | 0 | 0 |
| MA — Morocco | 87 | 224 | 0 | 0 | 16 |
| MZ — Mozambique | 11 | 38 | 0 | 0 | 1 |
| MM — Myanmar | 15 | 74 | 0 | 0 | 0 |
| NA — Namibia | 14 | 48 | 0 | 0 | 3 |
| NR — Nauru | 14 | 7 | 0 | 0 | 0 |
| NP — Nepal | 19 | 55 | 0 | 0 | 0 |
| NL — Netherlands | 15 | 1740 | 0 | 0 | 0 |
| NC — New Caledonia | 0 | 0 | 2 | 0 | 0 |
| NZ — New Zealand | 17 | 158 | 0 | 0 | 2 |
| NI — Nicaragua | 17 | 155 | 0 | 0 | 2 |
| NE — Niger | 7 | 70 | 0 | 0 | 11 |
| NG — Nigeria | 37 | 424 | 0 | 0 | 0 |
| NU — Niue | 0 | 0 | 2 | 0 | 0 |
| NF — Norfolk Island | 0 | 0 | 2 | 0 | 0 |
| KP — North Korea | 11 | 80 | 0 | 0 | 0 |
| MP — Northern Mariana Islands | 0 | 0 | 2 | 0 | 0 |
| NO — Norway | 21 | 668 | 0 | 0 | 5 |
| OM — Oman | 13 | 28 | 0 | 0 | 0 |
| PK — Pakistan | 8 | 458 | 0 | 0 | 4 |
| PW — Palau | 16 | 16 | 0 | 0 | 0 |
| PS — Palestine | 0 | 0 | 2 | 0 | 0 |
| PA — Panama | 13 | 600 | 0 | 0 | 4 |
| PG — Papua New Guinea | 21 | 101 | 0 | 0 | 14 |
| PY — Paraguay | 17 | 140 | 0 | 0 | 1 |
| PE — Peru | 25 | 483 | 0 | 0 | 48 |
| PH — Philippines | 97 | 6520 | 0 | 0 | 39 |
| PN — Pitcairn Island | 0 | 0 | 2 | 0 | 0 |
| PL — Poland | 16 | 3126 | 0 | 0 | 3 |
| PT — Portugal | 20 | 1313 | 0 | 0 | 0 |
| PR — Puerto Rico | 0 | 0 | 2 | 0 | 0 |
| QA — Qatar | 8 | 15 | 0 | 0 | 0 |
| RE — Reunion | 0 | 0 | 2 | 0 | 0 |
| RO — Romania | 42 | 8081 | 0 | 0 | 0 |
| RU — Russia | 84 | 5545 | 0 | 0 | 89 |
| RW — Rwanda | 5 | 12 | 0 | 0 | 0 |
| SH — Saint Helena | 0 | 0 | 2 | 0 | 0 |
| KN — Saint Kitts And Nevis | 15 | 13 | 0 | 0 | 0 |
| LC — Saint Lucia | 12 | 481 | 0 | 0 | 0 |
| PM — Saint Pierre and Miquelon | 0 | 0 | 2 | 0 | 0 |
| VC — Saint Vincent And the Grenadines | 6 | 9 | 0 | 0 | 0 |
| BL — Saint Barthélemy | 0 | 0 | 2 | 0 | 0 |
| MF — Saint-Martin (French part) | 0 | 0 | 2 | 0 | 0 |
| WS — Samoa | 11 | 20 | 0 | 0 | 0 |
| SM — San Marino | 9 | 9 | 0 | 0 | 0 |
| ST — Sao Tome and Principe | 2 | 5 | 0 | 0 | 0 |
| SA — Saudi Arabia | 13 | 563 | 0 | 0 | 1 |
| SN — Senegal | 14 | 73 | 0 | 0 | 2 |
| RS — Serbia | 26 | 334 | 0 | 0 | 1 |
| SC — Seychelles | 24 | 8 | 0 | 0 | 0 |
| SL — Sierra Leone | 4 | 90 | 0 | 0 | 0 |
| SG — Singapore | 5 | 2 | 0 | 0 | 0 |
| SX — Sint Maarten (Dutch part) | 0 | 0 | 2 | 0 | 0 |
| SK — Slovakia | 8 | 233 | 0 | 0 | 0 |
| SI — Slovenia | 211 | 311 | 0 | 0 | 0 |
| SB — Solomon Islands | 10 | 7 | 0 | 0 | 0 |
| SO — Somalia | 16 | 46 | 0 | 3 | 0 |
| ZA — South Africa | 9 | 314 | 0 | 0 | 19 |
| GS — South Georgia and the South Sandwich Islands | 0 | 0 | 2 | 0 | 0 |
| KR — South Korea | 17 | 309 | 0 | 0 | 0 |
| SS — South Sudan | 10 | 1 | 0 | 0 | 0 |
| ES — Spain | 28 | 6692 | 0 | 0 | 6 |
| LK — Sri Lanka | 33 | 147 | 0 | 0 | 11 |
| SD — Sudan | 18 | 71 | 0 | 0 | 0 |
| SR — Suriname | 10 | 13 | 0 | 0 | 0 |
| SJ — Svalbard And Jan Mayen Islands | 0 | 0 | 2 | 0 | 0 |
| SZ — Swaziland | 4 | 34 | 0 | 0 | 0 |
| SE — Sweden | 20 | 1072 | 0 | 0 | 16 |
| CH — Switzerland | 26 | 1506 | 0 | 0 | 1 |
| SY — Syria | 14 | 142 | 0 | 0 | 5 |
| TW — Taiwan | 22 | 40 | 0 | 1 | 2 |
| TJ — Tajikistan | 4 | 70 | 0 | 0 | 1 |
| TZ — Tanzania | 31 | 299 | 0 | 0 | 7 |
| TH — Thailand | 78 | 1240 | 0 | 0 | 11 |
| TG — Togo | 5 | 22 | 0 | 0 | 0 |
| TK — Tokelau | 0 | 0 | 3 | 0 | 0 |
| TO — Tonga | 5 | 8 | 0 | 0 | 0 |
| TT — Trinidad And Tobago | 16 | 25 | 0 | 0 | 0 |
| TN — Tunisia | 23 | 134 | 0 | 0 | 0 |
| TR — Türkiye | 81 | 1026 | 0 | 0 | 8 |
| TM — Turkmenistan | 6 | 30 | 0 | 0 | 0 |
| TC — Turks And Caicos Islands | 0 | 0 | 2 | 0 | 0 |
| TV — Tuvalu | 8 | 9 | 0 | 0 | 0 |
| UG — Uganda | 125 | 91 | 0 | 0 | 1 |
| UA — Ukraine | 25 | 1569 | 0 | 1 | 9 |
| AE — United Arab Emirates | 7 | 39 | 0 | 0 | 0 |
| GB — United Kingdom | 247 | 3871 | 0 | 2 | 5 |
| US — United States | 66 | 19818 | 0 | 15 | 33 |
| UM — United States Minor Outlying Islands | 0 | 0 | 4 | 0 | 0 |
| UY — Uruguay | 19 | 155 | 0 | 0 | 0 |
| UZ — Uzbekistan | 14 | 135 | 0 | 0 | 2 |
| VU — Vanuatu | 6 | 7 | 0 | 0 | 0 |
| VA — Vatican City | 0 | 0 | 2 | 0 | 0 |
| VE — Venezuela | 25 | 135 | 0 | 0 | 0 |
| VN — Vietnam | 63 | 467 | 0 | 0 | 1 |
| VG — British Virgin Islands | 0 | 0 | 2 | 0 | 0 |
| VI — U.S. Virgin Islands | 0 | 0 | 2 | 0 | 0 |
| WF — Wallis And Futuna | 0 | 0 | 2 | 0 | 0 |
| EH — Western Sahara | 0 | 0 | 2 | 0 | 0 |
| YE — Yemen | 21 | 342 | 0 | 0 | 2 |
| ZM — Zambia | 10 | 71 | 0 | 0 | 1 |
| ZW — Zimbabwe | 10 | 109 | 0 | 0 | 7 |
