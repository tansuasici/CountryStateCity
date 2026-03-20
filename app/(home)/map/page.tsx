'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Building,
  MapPin,
  Search,
  Layers,
  Info,
  MapPinned,
  Trash2,
  Map,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-lg border bg-muted p-2">
            <Map className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Interactive World Map</h1>
            <p className="text-sm text-muted-foreground">
              Explore countries, states, and cities on the map
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Badge variant="secondary">
            <Globe className="mr-1 h-3 w-3" /> {stats.countries} Countries
          </Badge>
          <Badge variant="secondary">
            <Building className="mr-1 h-3 w-3" /> {stats.states.toLocaleString()} States
          </Badge>
          <Badge variant="secondary">
            <MapPin className="mr-1 h-3 w-3" /> {stats.cities.toLocaleString()} Cities
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Panel */}
        <div className="space-y-4 lg:col-span-1">
          {/* Location Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4" /> Location Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Country */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Country
                </label>
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
                />
                {countrySearch && !selectedCountry && (
                  <div className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover">
                    {filteredCountries.slice(0, 20).map((country) => (
                      <button
                        key={country.id}
                        onClick={() => {
                          setSelectedCountry(country);
                          setCountrySearch('');
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
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
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    State/Province
                  </label>
                  <Input
                    placeholder="Search states..."
                    value={selectedState ? selectedState.name : stateSearch}
                    onChange={(e) => {
                      setStateSearch(e.target.value);
                      setSelectedState(null);
                    }}
                  />
                  {stateSearch && !selectedState && (
                    <div className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover">
                      {filteredStates.slice(0, 20).map((state) => (
                        <button
                          key={state.id}
                          onClick={() => {
                            setSelectedState(state);
                            setStateSearch('');
                          }}
                          className="w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
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
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    City
                  </label>
                  <Input
                    placeholder="Search cities..."
                    value={selectedCity ? selectedCity.name : citySearch}
                    onChange={(e) => {
                      setCitySearch(e.target.value);
                      setSelectedCity(null);
                    }}
                  />
                  {citySearch && !selectedCity && (
                    <div className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover">
                      {filteredCities.slice(0, 20).map((city) => (
                        <button
                          key={city.id}
                          onClick={() => {
                            setSelectedCity(city);
                            setCitySearch('');
                          }}
                          className="w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
                        >
                          {city.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 text-destructive"
                  onClick={clearAll}
                  disabled={!selectedCountry && !selectedState && !selectedCity}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  className="flex-1"
                  onClick={locateOnMap}
                  disabled={!selectedCountry && !selectedState && !selectedCity}
                >
                  <MapPinned className="mr-2 h-4 w-4" /> Locate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start h-9 text-sm"
                onClick={handleShowMultipleCountries}
              >
                <Globe className="mr-2 h-4 w-4" /> Show Top 10 Countries
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-9 text-sm"
                onClick={handleShowCapitals}
              >
                <Building className="mr-2 h-4 w-4" /> Show World Capitals
              </Button>
            </CardContent>
          </Card>

          {/* Location Details */}
          {selectedCountry && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="h-4 w-4" /> Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedCountry.emoji}</span>
                  <div>
                    <p className="font-semibold text-sm">{selectedCountry.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedCountry.native}</p>
                  </div>
                </div>
                <Separator />
                <div className="text-sm space-y-1.5">
                  {selectedCountry.capital && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capital</span>
                      <span>{selectedCountry.capital}</span>
                    </div>
                  )}
                  {selectedCountry.currency && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency</span>
                      <span>{selectedCountry.currency}</span>
                    </div>
                  )}
                  {selectedCountry.phoneCode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span>+{selectedCountry.phoneCode}</span>
                    </div>
                  )}
                  {selectedCountry.region && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Region</span>
                      <span>{selectedCountry.region}</span>
                    </div>
                  )}
                </div>
                {selectedState && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5" /> {selectedState.name}
                      </p>
                      {selectedState.stateCode && (
                        <p className="text-xs text-muted-foreground">
                          Code: {selectedState.stateCode}
                        </p>
                      )}
                    </div>
                  </>
                )}
                {selectedCity && (
                  <>
                    <Separator />
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {selectedCity.name}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Map */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <WorldMap
              selectedCountry={selectedCountry}
              selectedState={selectedState}
              selectedCity={selectedCity}
              markers={multipleMarkers}
              height="600px"
              onMapReady={handleMapReady}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
