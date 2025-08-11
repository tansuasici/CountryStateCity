'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Autocomplete,
  AutocompleteItem,
  Button,
  Chip,
  Divider,
  Tab,
  Tabs,
  Badge
} from '@heroui/react';
import { 
  Map, 
  Globe, 
  Building, 
  MapPin,
  Search,
  Filter,
  Layers,
  Info,
  MapPinned,
  Trash2
} from 'lucide-react';
import WorldMap from '@/components/WorldMap';
import { Country, State, City } from '@/types';

export default function MapPage() {
  const [selectedTab, setSelectedTab] = useState('explore');
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  
  const [multipleMarkers, setMultipleMarkers] = useState<any[]>([]);
  const [stats, setStats] = useState({ countries: 0, states: 0, cities: 0 });
  const [mapRef, setMapRef] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const { getCountries, getStats } = await import('@/lib/countries');
      const countriesData = getCountries();
      setCountries(countriesData);
      setStats(getStats());
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      const loadStates = async () => {
        const { getStatesByCountryId } = await import('@/lib/countries');
        const statesData = getStatesByCountryId(selectedCountry.id);
        setStates(statesData);
        setSelectedState(null);
        setSelectedCity(null);
        setCities([]);
      };
      loadStates();
    } else {
      setStates([]);
      setSelectedState(null);
      setSelectedCity(null);
      setCities([]);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedState) {
      const loadCities = async () => {
        const { getCitiesByStateId } = await import('@/lib/countries');
        const citiesData = getCitiesByStateId(selectedState.id);
        setCities(citiesData.slice(0, 100)); // İlk 100 şehri yükle
        setSelectedCity(null);
      };
      loadCities();
    } else {
      setCities([]);
      setSelectedCity(null);
    }
  }, [selectedState]);

  const handleShowMultipleCountries = async () => {
    const { getCountries } = await import('@/lib/countries');
    const topCountries = getCountries().slice(0, 10);
    const markers = topCountries
      .filter(c => c.latitude && c.longitude)
      .map(country => ({
        lat: parseFloat(country.latitude),
        lng: parseFloat(country.longitude),
        name: country.name,
        type: 'country' as const,
        data: country
      }));
    setMultipleMarkers(markers);
  };

  const handleShowCapitals = async () => {
    const { getCountries } = await import('@/lib/countries');
    const countriesWithCapitals = getCountries()
      .filter(c => c.capital && c.latitude && c.longitude)
      .slice(0, 20);
    
    const markers = countriesWithCapitals.map(country => ({
      lat: parseFloat(country.latitude),
      lng: parseFloat(country.longitude),
      name: `${country.capital} (${country.name})`,
      type: 'city' as const,
      data: { ...country, name: country.capital }
    }));
    setMultipleMarkers(markers);
  };

  const clearAll = useCallback(() => {
    setSelectedCountry(null);
    setSelectedState(null);
    setSelectedCity(null);
    setMultipleMarkers([]);
    setStates([]);
    setCities([]);
    
    // Haritayı başlangıç konumuna döndür
    if (mapRef && typeof mapRef.setView === 'function') {
      mapRef.setView([20, 0], 2);
    }
  }, [mapRef]);

  const locateOnMap = useCallback(() => {
    if (!mapRef || typeof mapRef.setView !== 'function') {
      console.log('Map not ready yet:', mapRef);
      return;
    }
    
    // En spesifik lokasyonu bul ve oraya zoom yap
    if (selectedCity && selectedCity.latitude && selectedCity.longitude) {
      mapRef.setView([parseFloat(selectedCity.latitude), parseFloat(selectedCity.longitude)], 12);
    } else if (selectedState && selectedState.latitude && selectedState.longitude) {
      mapRef.setView([parseFloat(selectedState.latitude), parseFloat(selectedState.longitude)], 8);
    } else if (selectedCountry && selectedCountry.latitude && selectedCountry.longitude) {
      mapRef.setView([parseFloat(selectedCountry.latitude), parseFloat(selectedCountry.longitude)], 6);
    }
  }, [mapRef, selectedCity, selectedState, selectedCountry]);

  const handleMapReady = useCallback((map: any) => {
    setMapRef(map);
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
            <Map className="text-primary-600 dark:text-primary-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Interactive World Map</h1>
            <p className="text-default-600">Explore countries, states, and cities on the map</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <Chip variant="flat" startContent={<Globe size={14} />}>
            {stats.countries} Countries
          </Chip>
          <Chip variant="flat" startContent={<Building size={14} />}>
            {stats.states.toLocaleString()} States
          </Chip>
          <Chip variant="flat" startContent={<MapPin size={14} />}>
            {stats.cities.toLocaleString()} Cities
          </Chip>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Search size={20} />
                Location Search
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <Autocomplete
                label="Country"
                placeholder="Search countries..."
                selectedKey={selectedCountry?.id.toString() || null}
                onSelectionChange={(key) => {
                  const country = countries.find(c => c.id.toString() === key);
                  setSelectedCountry(country || null);
                }}
              >
                {countries.map((country) => (
                  <AutocompleteItem
                    key={country.id.toString()}
                    textValue={country.name}
                    startContent={<span className="text-lg">{country.emoji}</span>}
                  >
                    {country.name}
                  </AutocompleteItem>
                ))}
              </Autocomplete>

              {states.length > 0 && (
                <Autocomplete
                  label="State/Province"
                  placeholder="Search states..."
                  selectedKey={selectedState?.id.toString() || null}
                  onSelectionChange={(key) => {
                    const state = states.find(s => s.id.toString() === key);
                    setSelectedState(state || null);
                  }}
                >
                  {states.map((state) => (
                    <AutocompleteItem
                      key={state.id.toString()}
                      textValue={state.name}
                    >
                      {state.name}
                    </AutocompleteItem>
                  ))}
                </Autocomplete>
              )}

              {cities.length > 0 && (
                <Autocomplete
                  label="City"
                  placeholder="Search cities..."
                  selectedKey={selectedCity?.id.toString() || null}
                  onSelectionChange={(key) => {
                    const city = cities.find(c => c.id.toString() === key);
                    setSelectedCity(city || null);
                  }}
                >
                  {cities.map((city) => (
                    <AutocompleteItem
                      key={city.id.toString()}
                      textValue={city.name}
                    >
                      {city.name}
                    </AutocompleteItem>
                  ))}
                </Autocomplete>
              )}

              <div className="flex gap-2">
                <Button
                  isIconOnly
                  color="danger"
                  variant="flat"
                  size="sm"
                  onPress={clearAll}
                  isDisabled={!selectedCountry && !selectedState && !selectedCity}
                >
                  <Trash2 size={16} />
                </Button>
                <Button
                  color="primary"
                  variant="flat"
                  size="sm"
                  onPress={locateOnMap}
                  className="flex-1"
                  startContent={<MapPinned size={16} />}
                  isDisabled={!selectedCountry && !selectedState && !selectedCity}
                >
                  Locate
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Layers size={20} />
                Quick Actions
              </h3>
            </CardHeader>
            <CardBody className="space-y-2">
              <Button
                variant="flat"
                size="sm"
                onPress={handleShowMultipleCountries}
                className="w-full justify-start"
                startContent={<Globe size={16} />}
              >
                Show Top 10 Countries
              </Button>
              <Button
                variant="flat"
                size="sm"
                onPress={handleShowCapitals}
                className="w-full justify-start"
                startContent={<Building size={16} />}
              >
                Show World Capitals
              </Button>
            </CardBody>
          </Card>

          {/* Selected Location Info */}
          {(selectedCountry || selectedState || selectedCity) && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Info size={20} />
                  Location Details
                </h3>
              </CardHeader>
              <CardBody>
                {selectedCountry && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedCountry.emoji}</span>
                      <div>
                        <p className="font-semibold">{selectedCountry.name}</p>
                        <p className="text-tiny text-default-500">{selectedCountry.native}</p>
                      </div>
                    </div>
                    <Divider className="my-2" />
                    <div className="text-sm space-y-1">
                      {selectedCountry.capital && (
                        <div className="flex justify-between">
                          <span className="text-default-500">Capital:</span>
                          <span>{selectedCountry.capital}</span>
                        </div>
                      )}
                      {selectedCountry.currency && (
                        <div className="flex justify-between">
                          <span className="text-default-500">Currency:</span>
                          <span>{selectedCountry.currency}</span>
                        </div>
                      )}
                      {selectedCountry.phoneCode && (
                        <div className="flex justify-between">
                          <span className="text-default-500">Phone:</span>
                          <span>+{selectedCountry.phoneCode}</span>
                        </div>
                      )}
                      {selectedCountry.region && (
                        <div className="flex justify-between">
                          <span className="text-default-500">Region:</span>
                          <span>{selectedCountry.region}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedState && (
                  <div className="mt-4">
                    <p className="font-semibold flex items-center gap-2">
                      <Building size={16} />
                      {selectedState.name}
                    </p>
                    {selectedState.stateCode && (
                      <p className="text-tiny text-default-500">Code: {selectedState.stateCode}</p>
                    )}
                  </div>
                )}

                {selectedCity && (
                  <div className="mt-4">
                    <p className="font-semibold flex items-center gap-2">
                      <MapPin size={16} />
                      {selectedCity.name}
                    </p>
                    {selectedCity.wikiDataId && (
                      <p className="text-tiny text-default-500">WikiData: {selectedCity.wikiDataId}</p>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right Panel - Map */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardBody className="p-0">
              <WorldMap
                selectedCountry={selectedCountry}
                selectedState={selectedState}
                selectedCity={selectedCity}
                markers={multipleMarkers}
                height="600px"
                onMapReady={handleMapReady}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}