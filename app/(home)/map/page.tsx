'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Building,
  MapPin,
  Search,
  Layers,
  MapPinned,
  Trash2,
  ChevronRight,
  X,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
  const [panelOpen, setPanelOpen] = useState(true);

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
    setMultipleMarkers(
      topCountries
        .filter((c) => c.latitude && c.longitude)
        .map((country) => ({
          lat: parseFloat(country.latitude),
          lng: parseFloat(country.longitude),
          name: country.name,
          type: 'country' as const,
          data: country,
        }))
    );
  };

  const handleShowCapitals = async () => {
    const { getCountries } = await import('@/lib/countries');
    const countriesWithCapitals = getCountries()
      .filter((c) => c.capital && c.latitude && c.longitude)
      .slice(0, 20);
    setMultipleMarkers(
      countriesWithCapitals.map((country) => ({
        lat: parseFloat(country.latitude),
        lng: parseFloat(country.longitude),
        name: `${country.capital} (${country.name})`,
        type: 'city' as const,
        data: { ...country, name: country.capital },
      }))
    );
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

  const hasSelection = !!(selectedCountry || selectedState || selectedCity);

  return (
    <div className="relative" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Full-bleed Map */}
      <WorldMap
        selectedCountry={selectedCountry}
        selectedState={selectedState}
        selectedCity={selectedCity}
        markers={multipleMarkers}
        height="100%"
        onMapReady={handleMapReady}
      />

      {/* Floating panel toggle */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="absolute left-4 top-4 z-[1000] flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 text-sm font-medium shadow-lg backdrop-blur-sm hover:bg-muted transition-colors"
        >
          <Search className="h-4 w-4" />
          Search
          <ChevronRight className="h-3 w-3" />
        </button>
      )}

      {/* Floating Stats Bar */}
      <div className="absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-full border bg-background/95 px-5 py-2 shadow-lg backdrop-blur-sm">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="h-3 w-3 text-primary" />
          <span className="font-semibold text-foreground">{stats.countries}</span> countries
        </span>
        <span className="h-3 w-px bg-border" />
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building className="h-3 w-3 text-primary" />
          <span className="font-semibold text-foreground">
            {stats.states.toLocaleString()}
          </span>{' '}
          states
        </span>
        <span className="h-3 w-px bg-border" />
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 text-primary" />
          <span className="font-semibold text-foreground">
            {stats.cities.toLocaleString()}
          </span>{' '}
          cities
        </span>
      </div>

      {/* Floating Sidebar Panel */}
      {panelOpen && (
        <div className="absolute left-4 top-4 bottom-16 z-[1000] flex w-80 flex-col overflow-hidden rounded-xl border bg-background/95 shadow-xl backdrop-blur-sm">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Explorer</span>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Search Section */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Location
              </p>

              {/* Country */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Country</label>
                <Input
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
                  className="h-8 text-sm"
                />
                {countrySearch && !selectedCountry && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                    {filteredCountries.slice(0, 15).map((country) => (
                      <button
                        key={country.id}
                        onClick={() => {
                          setSelectedCountry(country);
                          setCountrySearch('');
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left transition-colors"
                      >
                        <span>{country.emoji}</span>
                        <span className="truncate">{country.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* State */}
              {states.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    State / Province
                  </label>
                  <Input
                    placeholder="Search states..."
                    value={selectedState ? selectedState.name : stateSearch}
                    onChange={(e) => {
                      setStateSearch(e.target.value);
                      setSelectedState(null);
                    }}
                    className="h-8 text-sm"
                  />
                  {stateSearch && !selectedState && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                      {filteredStates.slice(0, 15).map((state) => (
                        <button
                          key={state.id}
                          onClick={() => {
                            setSelectedState(state);
                            setStateSearch('');
                          }}
                          className="w-full px-3 py-1.5 text-sm hover:bg-accent text-left transition-colors truncate"
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
                  <label className="text-xs text-muted-foreground mb-1 block">City</label>
                  <Input
                    placeholder="Search cities..."
                    value={selectedCity ? selectedCity.name : citySearch}
                    onChange={(e) => {
                      setCitySearch(e.target.value);
                      setSelectedCity(null);
                    }}
                    className="h-8 text-sm"
                  />
                  {citySearch && !selectedCity && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                      {filteredCities.slice(0, 15).map((city) => (
                        <button
                          key={city.id}
                          onClick={() => {
                            setSelectedCity(city);
                            setCitySearch('');
                          }}
                          className="w-full px-3 py-1.5 text-sm hover:bg-accent text-left transition-colors truncate"
                        >
                          {city.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={clearAll}
                  disabled={!hasSelection}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  className="flex-1 h-8 text-sm"
                  onClick={locateOnMap}
                  disabled={!hasSelection}
                >
                  <MapPinned className="mr-1.5 h-3.5 w-3.5" /> Locate
                </Button>
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Quick Actions
              </p>
              <button
                onClick={handleShowMultipleCountries}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-muted transition-colors text-left"
              >
                <Globe className="h-3.5 w-3.5 text-primary" />
                Show Top 10 Countries
              </button>
              <button
                onClick={handleShowCapitals}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-muted transition-colors text-left"
              >
                <Building className="h-3.5 w-3.5 text-primary" />
                Show World Capitals
              </button>
            </div>

            {/* Details */}
            {selectedCountry && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Details
                  </p>

                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none">{selectedCountry.emoji}</span>
                    <div>
                      <p className="font-semibold text-sm">{selectedCountry.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedCountry.native}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                    {selectedCountry.capital && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capital</span>
                        <span className="font-medium">{selectedCountry.capital}</span>
                      </div>
                    )}
                    {selectedCountry.currency && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Currency</span>
                        <span className="font-medium">{selectedCountry.currency}</span>
                      </div>
                    )}
                    {selectedCountry.phoneCode && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="font-medium">+{selectedCountry.phoneCode}</span>
                      </div>
                    )}
                    {selectedCountry.region && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Region</span>
                        <span className="font-medium">{selectedCountry.region}</span>
                      </div>
                    )}
                  </div>

                  {selectedState && (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="font-semibold text-sm flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-primary" /> {selectedState.name}
                      </p>
                      {selectedState.stateCode && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Code: {selectedState.stateCode}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedCity && (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="font-semibold text-sm flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" /> {selectedCity.name}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
