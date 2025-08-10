'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Autocomplete,
  AutocompleteItem,
  Card, 
  CardBody, 
  CardHeader,
  Chip,
  Button,
  Skeleton,
  Divider,
  Badge,
  Progress
} from "@heroui/react";
import { Country, State, City } from '@/types';
import { 
  MapPin, 
  Globe, 
  Building, 
  Home,
  RefreshCw
} from 'lucide-react';

export default function CountryStateCity() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  
  const [loading, setLoading] = useState({
    countries: false,
    states: false,
    cities: false,
  });

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      loadStates(Number(selectedCountry));
      setSelectedState('');
      setSelectedCity('');
      setCities([]);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedState) {
      loadCities(Number(selectedState));
      setSelectedCity('');
    }
  }, [selectedState]);

  const loadCountries = async () => {
    setLoading(prev => ({ ...prev, countries: true }));
    try {
      const { getCountries } = await import('@/lib/countries');
      const data = getCountries(300);
      setCountries(data);
    } catch (error) {
      console.error('Error loading countries:', error);
    } finally {
      setLoading(prev => ({ ...prev, countries: false }));
    }
  };

  const loadStates = async (countryId: number) => {
    setLoading(prev => ({ ...prev, states: true }));
    try {
      const { getStatesByCountryId } = await import('@/lib/countries');
      const data = getStatesByCountryId(countryId);
      setStates(data);
    } catch (error) {
      console.error('Error loading states:', error);
    } finally {
      setLoading(prev => ({ ...prev, states: false }));
    }
  };

  const loadCities = async (stateId: number) => {
    setLoading(prev => ({ ...prev, cities: true }));
    try {
      const { getCitiesByStateId } = await import('@/lib/countries');
      const data = getCitiesByStateId(stateId);
      setCities(data);
    } catch (error) {
      console.error('Error loading cities:', error);
    } finally {
      setLoading(prev => ({ ...prev, cities: false }));
    }
  };

  const selectedCountryData = useMemo(() => {
    return countries.find(c => c.id === Number(selectedCountry));
  }, [selectedCountry, countries]);

  const selectedStateData = useMemo(() => {
    return states.find(s => s.id === Number(selectedState));
  }, [selectedState, states]);

  const selectedCityData = useMemo(() => {
    return cities.find(c => c.id === Number(selectedCity));
  }, [selectedCity, cities]);

  const handleReset = () => {
    setSelectedCountry('');
    setSelectedState('');
    setSelectedCity('');
    setStates([]);
    setCities([]);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center w-full">
          <div className="flex gap-3 items-center">
            <MapPin className="text-primary" size={24} />
            <div>
              <h3 className="text-lg font-semibold">Location Selector</h3>
              <p className="text-small text-default-500">
                Select your location step by step
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <Divider />
      
      <CardBody className="gap-4">
        {/* Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Country Selection */}
          <div>
            {loading.countries ? (
              <Skeleton className="rounded-lg">
                <div className="h-14 rounded-lg bg-default-300"></div>
              </Skeleton>
            ) : (
              <Autocomplete
                label="Country"
                placeholder="Search countries..."
                variant="bordered"
                selectedKey={selectedCountry || null}
                onSelectionChange={(key) => setSelectedCountry(key?.toString() || '')}
                isLoading={loading.countries}
                description={`${countries.length} countries available`}
              >
                {countries.map((country) => (
                  <AutocompleteItem 
                    key={country.id} 
                    textValue={country.name}
                    startContent={<span className="text-lg">{country.emoji}</span>}
                    endContent={<span className="text-small text-default-500">+{country.phoneCode}</span>}
                  >
                    {country.name} ({country.iso2})
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            )}
          </div>

          {/* State Selection */}
          <div>
            {loading.states ? (
              <Skeleton className="rounded-lg">
                <div className="h-14 rounded-lg bg-default-300"></div>
              </Skeleton>
            ) : (
              <Autocomplete
                label="State/Province"
                placeholder={selectedCountry ? "Search states..." : "Select country first"}
                variant="bordered"
                isDisabled={!selectedCountry}
                selectedKey={selectedState || null}
                onSelectionChange={(key) => setSelectedState(key?.toString() || '')}
                isLoading={loading.states}
                description={states.length > 0 ? `${states.length} states available` : undefined}
              >
                {states.map((state) => (
                  <AutocompleteItem 
                    key={state.id} 
                    textValue={state.name}
                    endContent={
                      state.stateCode && (
                        <Chip size="sm" variant="flat">
                          {state.stateCode}
                        </Chip>
                      )
                    }
                  >
                    {state.name}
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            )}
          </div>

          {/* City Selection */}
          <div>
            {loading.cities ? (
              <Skeleton className="rounded-lg">
                <div className="h-14 rounded-lg bg-default-300"></div>
              </Skeleton>
            ) : (
              <Autocomplete
                label="City"
                placeholder={selectedState ? "Search cities..." : "Select state first"}
                variant="bordered"
                isDisabled={!selectedState}
                selectedKey={selectedCity || null}
                onSelectionChange={(key) => setSelectedCity(key?.toString() || '')}
                isLoading={loading.cities}
                description={cities.length > 0 ? `${cities.length} cities available` : undefined}
              >
                {cities.map((city) => (
                  <AutocompleteItem 
                    key={city.id} 
                    textValue={city.name}
                  >
                    {city.name}
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            )}
          </div>
        </div>


        {/* Selected Location Display */}
        {(selectedCountryData || selectedStateData || selectedCityData) && (
          <>
            <Divider />
            <div className="space-y-4">
              <p className="text-small font-semibold text-default-600">
                Selected Location Details:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Country Card */}
                {selectedCountryData && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{selectedCountryData.emoji}</span>
                        <h4 className="font-semibold">Country</h4>
                      </div>
                    </CardHeader>
                    <CardBody className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <p className="text-large font-bold">{selectedCountryData.name}</p>
                          <p className="text-small text-default-500">{selectedCountryData.iso2} • +{selectedCountryData.phoneCode}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex justify-between">
                            <span className="text-small text-default-500">Capital:</span>
                            <span className="text-small font-semibold">{selectedCountryData.capital}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-small text-default-500">Currency:</span>
                            <span className="text-small font-semibold">
                              {selectedCountryData.currency}
                              {selectedCountryData.currencySymbol && ` (${selectedCountryData.currencySymbol})`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-small text-default-500">Region:</span>
                            <span className="text-small font-semibold">{selectedCountryData.region}</span>
                          </div>
                          {selectedCountryData.subregion && (
                            <div className="flex justify-between">
                              <span className="text-small text-default-500">Subregion:</span>
                              <span className="text-small font-semibold">{selectedCountryData.subregion}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* State Card */}
                {selectedStateData && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Building size={18} className="text-success" />
                        <h4 className="font-semibold">State/Province</h4>
                      </div>
                    </CardHeader>
                    <CardBody className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <p className="text-large font-bold">{selectedStateData.name}</p>
                          {selectedStateData.stateCode && (
                            <p className="text-small text-default-500">Code: {selectedStateData.stateCode}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex justify-between">
                            <span className="text-small text-default-500">Country:</span>
                            <span className="text-small font-semibold">{selectedCountryData?.name}</span>
                          </div>
                          {selectedStateData.type && (
                            <div className="flex justify-between">
                              <span className="text-small text-default-500">Type:</span>
                              <span className="text-small font-semibold">{selectedStateData.type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* City Card */}
                {selectedCityData && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Home size={18} className="text-warning" />
                        <h4 className="font-semibold">City</h4>
                      </div>
                    </CardHeader>
                    <CardBody className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <p className="text-large font-bold">{selectedCityData.name}</p>
                          <p className="text-small text-default-500">City</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex justify-between">
                            <span className="text-small text-default-500">State:</span>
                            <span className="text-small font-semibold">{selectedStateData?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-small text-default-500">Country:</span>
                            <span className="text-small font-semibold">{selectedCountryData?.name}</span>
                          </div>
                          {selectedCityData.latitude && selectedCityData.longitude && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-small text-default-500">Latitude:</span>
                                <span className="text-small font-semibold">{selectedCityData.latitude}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-small text-default-500">Longitude:</span>
                                <span className="text-small font-semibold">{selectedCityData.longitude}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}