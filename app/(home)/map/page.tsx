'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Map,
  Globe,
  Building,
  MapPin,
  Search,
  Layers,
  Info,
  MapPinned,
  Trash2,
} from 'lucide-react';
import WorldMap from '@/components/WorldMap';
import { Country, State, City } from '@/types';

export default function MapPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const [multipleMarkers, setMultipleMarkers] = useState<any[]>([]);
  const [stats, setStats] = useState({ countries: 0, states: 0, cities: 0 });
  const [mapRef, setMapRef] = useState<any>(null);

  const [countrySearch, setCountrySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const { getCountries, getStats } = await import('@/lib/countries');
      setCountries(getCountries());
      setStats(getStats());
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      const loadStates = async () => {
        const { getStatesByCountryId } = await import('@/lib/countries');
        setStates(getStatesByCountryId(selectedCountry.id));
        setSelectedState(null);
        setSelectedCity(null);
        setCities([]);
        setStateSearch('');
        setCitySearch('');
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
        setCities(getCitiesByStateId(selectedState.id).slice(0, 100));
        setSelectedCity(null);
        setCitySearch('');
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
      .filter((c) => c.latitude && c.longitude)
      .map((country) => ({
        lat: parseFloat(country.latitude),
        lng: parseFloat(country.longitude),
        name: country.name,
        type: 'country' as const,
        data: country,
      }));
    setMultipleMarkers(markers);
  };

  const handleShowCapitals = async () => {
    const { getCountries } = await import('@/lib/countries');
    const countriesWithCapitals = getCountries()
      .filter((c) => c.capital && c.latitude && c.longitude)
      .slice(0, 20);
    const markers = countriesWithCapitals.map((country) => ({
      lat: parseFloat(country.latitude),
      lng: parseFloat(country.longitude),
      name: `${country.capital} (${country.name})`,
      type: 'city' as const,
      data: { ...country, name: country.capital },
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
    setCountrySearch('');
    setStateSearch('');
    setCitySearch('');
    if (mapRef && typeof mapRef.setView === 'function') {
      mapRef.setView([20, 0], 2);
    }
  }, [mapRef]);

  const locateOnMap = useCallback(() => {
    if (!mapRef || typeof mapRef.setView !== 'function') return;
    if (selectedCity?.latitude && selectedCity?.longitude) {
      mapRef.setView([parseFloat(selectedCity.latitude), parseFloat(selectedCity.longitude)], 12);
    } else if (selectedState?.latitude && selectedState?.longitude) {
      mapRef.setView([parseFloat(selectedState.latitude), parseFloat(selectedState.longitude)], 8);
    } else if (selectedCountry?.latitude && selectedCountry?.longitude) {
      mapRef.setView(
        [parseFloat(selectedCountry.latitude), parseFloat(selectedCountry.longitude)],
        6
      );
    }
  }, [mapRef, selectedCity, selectedState, selectedCountry]);

  const handleMapReady = useCallback((map: any) => {
    setMapRef(map);
  }, []);

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const filteredStates = states.filter((s) =>
    s.name.toLowerCase().includes(stateSearch.toLowerCase())
  );
  const filteredCities = cities.filter((c) =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl">
            <Map className="text-indigo-600 dark:text-indigo-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Interactive World Map</h1>
            <p className="text-fd-muted-foreground">
              Explore countries, states, and cities on the map
            </p>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fd-secondary text-fd-secondary-foreground text-sm">
            <Globe size={14} /> {stats.countries} Countries
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fd-secondary text-fd-secondary-foreground text-sm">
            <Building size={14} /> {stats.states.toLocaleString()} States
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fd-secondary text-fd-secondary-foreground text-sm">
            <MapPin size={14} /> {stats.cities.toLocaleString()} Cities
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Location Search */}
          <div className="rounded-xl border border-fd-border bg-fd-card p-4 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Search size={20} /> Location Search
            </h3>

            {/* Country */}
            <div>
              <label className="text-sm font-medium text-fd-muted-foreground mb-1 block">
                Country
              </label>
              <input
                type="text"
                placeholder="Search countries..."
                value={
                  selectedCountry
                    ? `${selectedCountry.emoji} ${selectedCountry.name}`
                    : countrySearch
                }
                onChange={(e) => {
                  setCountrySearch(e.target.value);
                  setSelectedCountry(null);
                }}
                className="w-full px-3 py-2 rounded-lg border border-fd-border bg-fd-background text-sm focus:outline-none focus:ring-2 focus:ring-fd-ring"
              />
              {countrySearch && !selectedCountry && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-fd-border bg-fd-card">
                  {filteredCountries.slice(0, 20).map((country) => (
                    <button
                      key={country.id}
                      onClick={() => {
                        setSelectedCountry(country);
                        setCountrySearch('');
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-fd-accent flex items-center gap-2"
                    >
                      <span>{country.emoji}</span> {country.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* State */}
            {states.length > 0 && (
              <div>
                <label className="text-sm font-medium text-fd-muted-foreground mb-1 block">
                  State/Province
                </label>
                <input
                  type="text"
                  placeholder="Search states..."
                  value={selectedState ? selectedState.name : stateSearch}
                  onChange={(e) => {
                    setStateSearch(e.target.value);
                    setSelectedState(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-fd-border bg-fd-background text-sm focus:outline-none focus:ring-2 focus:ring-fd-ring"
                />
                {stateSearch && !selectedState && (
                  <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-fd-border bg-fd-card">
                    {filteredStates.slice(0, 20).map((state) => (
                      <button
                        key={state.id}
                        onClick={() => {
                          setSelectedState(state);
                          setStateSearch('');
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-fd-accent"
                      >
                        {state.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* City */}
            {cities.length > 0 && (
              <div>
                <label className="text-sm font-medium text-fd-muted-foreground mb-1 block">
                  City
                </label>
                <input
                  type="text"
                  placeholder="Search cities..."
                  value={selectedCity ? selectedCity.name : citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setSelectedCity(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-fd-border bg-fd-background text-sm focus:outline-none focus:ring-2 focus:ring-fd-ring"
                />
                {citySearch && !selectedCity && (
                  <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-fd-border bg-fd-card">
                    {filteredCities.slice(0, 20).map((city) => (
                      <button
                        key={city.id}
                        onClick={() => {
                          setSelectedCity(city);
                          setCitySearch('');
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-fd-accent"
                      >
                        {city.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={clearAll}
                disabled={!selectedCountry && !selectedState && !selectedCity}
                className="p-2 rounded-lg border border-fd-border text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-40"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={locateOnMap}
                disabled={!selectedCountry && !selectedState && !selectedCity}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                <MapPinned size={16} /> Locate
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-fd-border bg-fd-card p-4 space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Layers size={20} /> Quick Actions
            </h3>
            <button
              onClick={handleShowMultipleCountries}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-fd-accent text-left"
            >
              <Globe size={16} /> Show Top 10 Countries
            </button>
            <button
              onClick={handleShowCapitals}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-fd-accent text-left"
            >
              <Building size={16} /> Show World Capitals
            </button>
          </div>

          {/* Location Details */}
          {selectedCountry && (
            <div className="rounded-xl border border-fd-border bg-fd-card p-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Info size={20} /> Location Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedCountry.emoji}</span>
                  <div>
                    <p className="font-semibold">{selectedCountry.name}</p>
                    <p className="text-xs text-fd-muted-foreground">{selectedCountry.native}</p>
                  </div>
                </div>
                <hr className="border-fd-border" />
                <div className="text-sm space-y-1">
                  {selectedCountry.capital && (
                    <div className="flex justify-between">
                      <span className="text-fd-muted-foreground">Capital:</span>
                      <span>{selectedCountry.capital}</span>
                    </div>
                  )}
                  {selectedCountry.currency && (
                    <div className="flex justify-between">
                      <span className="text-fd-muted-foreground">Currency:</span>
                      <span>{selectedCountry.currency}</span>
                    </div>
                  )}
                  {selectedCountry.phoneCode && (
                    <div className="flex justify-between">
                      <span className="text-fd-muted-foreground">Phone:</span>
                      <span>+{selectedCountry.phoneCode}</span>
                    </div>
                  )}
                  {selectedCountry.region && (
                    <div className="flex justify-between">
                      <span className="text-fd-muted-foreground">Region:</span>
                      <span>{selectedCountry.region}</span>
                    </div>
                  )}
                </div>
                {selectedState && (
                  <div className="mt-3">
                    <p className="font-semibold flex items-center gap-2">
                      <Building size={16} /> {selectedState.name}
                    </p>
                    {selectedState.stateCode && (
                      <p className="text-xs text-fd-muted-foreground">
                        Code: {selectedState.stateCode}
                      </p>
                    )}
                  </div>
                )}
                {selectedCity && (
                  <div className="mt-3">
                    <p className="font-semibold flex items-center gap-2">
                      <MapPin size={16} /> {selectedCity.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Map */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-fd-border overflow-hidden">
            <WorldMap
              selectedCountry={selectedCountry}
              selectedState={selectedState}
              selectedCity={selectedCity}
              markers={multipleMarkers}
              height="600px"
              onMapReady={handleMapReady}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
