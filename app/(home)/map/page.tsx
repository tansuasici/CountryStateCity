'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, useDragControls, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import {
  Globe,
  Building,
  MapPin,
  Search,
  MapPinned,
  RotateCcw,
  ChevronRight,
  X,
  ArrowRight,
  Layers3,
  Download,
  MessageSquarePlus,
} from 'lucide-react';
import WorldMap, { type MapMarker } from '@/components/WorldMap';
import SearchableLocationSelect from '@/components/SearchableLocationSelect';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getCityDisplayName,
  getCountryDisplayName,
  getPlaceDisplay,
  getStateDisplay,
} from '@/lib/location-display';
import { Country, State, City } from '@/types';
import type { Map as MapLibreMap } from 'maplibre-gl';
import CountryFlag from '@/components/CountryFlag';
import type {
  BoundaryCountryManifest,
  BoundaryLevel,
  BoundaryProfileKey,
  LoadedBoundaryLayer,
} from '@/lib/boundaries';

const BOUNDARY_PROFILE_LABELS: Record<string, string> = {
  overview: 'Overview',
  regional: 'Regional',
  detailed: 'Detailed',
};

export default function MapPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [countryCities, setCountryCities] = useState<City[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [cityLoadError, setCityLoadError] = useState<string | null>(null);
  const [cityLoadAttempt, setCityLoadAttempt] = useState(0);
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>('points');
  const [boundaryProfile, setBoundaryProfile] = useState<BoundaryProfileKey>('overview');
  const [boundaryCountry, setBoundaryCountry] = useState<BoundaryCountryManifest | null>(null);
  const [boundaryLayer, setBoundaryLayer] = useState<LoadedBoundaryLayer | null>(null);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);
  const [boundaryLoadAttempt, setBoundaryLoadAttempt] = useState(0);

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const [multipleMarkers, setMultipleMarkers] = useState<MapMarker[]>([]);
  const [stats, setStats] = useState({ countries: 0, states: 0, cities: 0 });
  const [mapRef, setMapRef] = useState<MapLibreMap | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [compactViewport, setCompactViewport] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelDragControls = useDragControls();

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
    const compactViewport = window.matchMedia('(max-width: 900px)');
    const syncCompactViewport = (matches: boolean) => {
      setCompactViewport(matches);
      if (matches) setPanelOpen(false);
    };
    const handleViewportChange = (event: MediaQueryListEvent) => syncCompactViewport(event.matches);

    syncCompactViewport(compactViewport.matches);
    compactViewport.addEventListener('change', handleViewportChange);
    return () => compactViewport.removeEventListener('change', handleViewportChange);
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      const loadStates = async () => {
        setStatesLoading(true);
        const { getStatesByCountryId } = await import('@/lib/countries');
        setStates(getStatesByCountryId(selectedCountry.id));
        setStatesLoading(false);
        setSelectedState(null);
        setSelectedCity(null);
        setCities([]);
        setStateSearch('');
        setCitySearch('');
      };
      loadStates();
    } else {
      setStatesLoading(false);
      setStates([]);
      setSelectedState(null);
      setSelectedCity(null);
      setCities([]);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (!selectedCountry) {
      setCountryCities([]);
      setCitiesLoading(false);
      setCityLoadError(null);
      return;
    }
    const controller = new AbortController();
    setCountryCities([]);
    setCitiesLoading(true);
    setCityLoadError(null);
    void (async () => {
      try {
        const { getCitiesByCountryId } = await import('@/lib/countries');
        const loaded = await getCitiesByCountryId(selectedCountry.id, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setCountryCities(loaded);
      } catch (error) {
        if (!controller.signal.aborted)
          setCityLoadError(
            error instanceof Error ? error.message : 'City data could not be loaded.'
          );
      } finally {
        if (!controller.signal.aborted) setCitiesLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedCountry, cityLoadAttempt]);

  useEffect(() => {
    if (selectedCountry?.iso2 !== 'TR') {
      setBoundaryCountry(null);
      setBoundaryLayer(null);
      setBoundaryLoading(false);
      setBoundaryError(null);
      if (boundaryLevel !== 'points') setBoundaryLevel('points');
      return;
    }
    const controller = new AbortController();
    setBoundaryError(null);
    void (async () => {
      try {
        const { getBoundaryLayer, getBoundaryManifest } = await import('@/lib/boundaries');
        const manifest = await getBoundaryManifest(controller.signal);
        if (controller.signal.aborted) return;
        setBoundaryCountry(manifest.countries.TR);
        if (boundaryLevel === 'points') {
          setBoundaryLayer(null);
          setBoundaryLoading(false);
          return;
        }
        setBoundaryLayer(null);
        setBoundaryLoading(true);
        const loaded = await getBoundaryLayer(
          'TR',
          boundaryLevel,
          boundaryProfile,
          controller.signal
        );
        if (!controller.signal.aborted) setBoundaryLayer(loaded);
      } catch (error) {
        if (!controller.signal.aborted) {
          setBoundaryError(
            error instanceof Error ? error.message : 'Boundary layer could not be loaded.'
          );
        }
      } finally {
        if (!controller.signal.aborted) setBoundaryLoading(false);
      }
    })();
    return () => controller.abort();
  }, [boundaryLevel, boundaryLoadAttempt, boundaryProfile, selectedCountry]);

  useEffect(() => {
    if (!selectedState) {
      setCities([]);
      setSelectedCity(null);
      return;
    }
    setCities(countryCities.filter((city) => city.stateId === selectedState.id));
    setSelectedCity(null);
    setCitySearch('');
  }, [countryCities, selectedState]);

  const handleShowMultipleCountries = async () => {
    const { getCountries } = await import('@/lib/countries');
    const topCountries = getCountries().slice(0, 10);
    setMultipleMarkers(
      topCountries
        .filter((c) => c.latitude && c.longitude)
        .map((country) => ({
          lat: Number(country.latitude),
          lng: Number(country.longitude),
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
        lat: Number(country.latitude),
        lng: Number(country.longitude),
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
    setCountryCities([]);
    setCityLoadError(null);
    setCountrySearch('');
    setStateSearch('');
    setCitySearch('');
    if (mapRef) {
      const compact = window.matchMedia('(max-width: 900px)').matches;
      const camera: {
        center: [number, number];
        zoom: number;
        pitch: number;
        bearing: number;
      } = {
        center: [18, 21],
        zoom: compact ? 1.22 : 1.65,
        pitch: compact ? 8 : 13,
        bearing: -6,
      };
      if (reduceMotion) mapRef.jumpTo(camera);
      else mapRef.flyTo({ ...camera, duration: 1200 });
    }
  }, [mapRef, reduceMotion]);

  const locateOnMap = useCallback(() => {
    if (!mapRef) return;
    let camera: {
      center: [number, number];
      zoom: number;
      pitch: number;
      bearing: number;
    } | null = null;
    if (selectedCity?.latitude && selectedCity?.longitude) {
      camera = {
        center: [Number(selectedCity.longitude), Number(selectedCity.latitude)],
        zoom: 11,
        pitch: 58,
        bearing: 18,
      };
    } else if (selectedState?.latitude && selectedState?.longitude) {
      camera = {
        center: [Number(selectedState.longitude), Number(selectedState.latitude)],
        zoom: 6.5,
        pitch: 45,
        bearing: 18,
      };
    } else if (selectedCountry?.latitude && selectedCountry?.longitude) {
      camera = {
        center: [Number(selectedCountry.longitude), Number(selectedCountry.latitude)],
        zoom: 4.2,
        pitch: 30,
        bearing: -12,
      };
    }
    if (!camera) return;
    if (reduceMotion) mapRef.jumpTo(camera);
    else mapRef.flyTo({ ...camera, duration: 1600 });
  }, [mapRef, reduceMotion, selectedCity, selectedState, selectedCountry]);

  const handleMapReady = useCallback((map: MapLibreMap) => {
    setMapRef(map);
  }, []);

  const hasSelection = !!(selectedCountry || selectedState || selectedCity);
  const hasPolygonCoverage = selectedCountry?.iso2 === 'TR';
  const activeStep = selectedState ? 'city' : selectedCountry ? 'state' : 'country';
  const selectedCoordinates = selectedCity
    ? [selectedCity.latitude, selectedCity.longitude]
    : selectedState
      ? [selectedState.latitude, selectedState.longitude]
      : selectedCountry
        ? [selectedCountry.latitude, selectedCountry.longitude]
        : null;
  const selectedCountryDisplayName = selectedCountry
    ? getCountryDisplayName(selectedCountry)
    : null;
  const selectedStateDisplay = selectedState ? getStateDisplay(selectedState) : null;
  const selectedCityDisplayName = selectedCity ? getCityDisplayName(selectedCity) : null;
  const mapSelectedCountry = selectedCountry
    ? { ...selectedCountry, name: selectedCountryDisplayName ?? selectedCountry.name }
    : null;
  const mapSelectedState = selectedState
    ? { ...selectedState, name: selectedStateDisplay?.name ?? selectedState.name }
    : null;
  const mapSelectedCity = selectedCity
    ? { ...selectedCity, name: selectedCityDisplayName ?? selectedCity.name }
    : null;
  const correctionPublicId = selectedCity
    ? `csc:city:${selectedCity.id}`
    : selectedState
      ? `csc:state:${selectedState.id}`
      : selectedCountry
        ? `csc:country:${selectedCountry.id}`
        : null;
  const correctionUrl = correctionPublicId
    ? `https://github.com/tansuasici/CountryStateCity/issues/new?template=data_correction.yml&title=${encodeURIComponent(`[Data correction]: ${correctionPublicId}`)}`
    : null;

  return (
    <div
      className={`map-workspace relative ${panelOpen ? 'has-explorer-panel' : ''}`}
      // Runs under the transparent nav so the globe fills the viewport.
      style={{ height: '100svh', marginTop: '-3.5rem' }}
    >
      {/* Full-bleed Map */}
      <WorldMap
        selectedCountry={mapSelectedCountry}
        selectedState={mapSelectedState}
        selectedCity={mapSelectedCity}
        markers={multipleMarkers}
        boundaryData={boundaryLayer?.data}
        boundaryLevel={boundaryLevel === 'points' ? null : boundaryLevel}
        boundarySelectionId={
          boundaryLevel === 'admin1'
            ? (selectedState?.id ?? null)
            : boundaryLevel === 'admin2'
              ? (selectedCity?.id ?? null)
              : null
        }
        showPoints={boundaryLevel === 'points'}
        height="100%"
        panelOpen={panelOpen}
        onMapReady={handleMapReady}
      />

      {/* Floating panel toggle */}
      <AnimatePresence initial={false}>
        {!panelOpen ? (
          <m.button
            key="map-panel-toggle"
            type="button"
            onClick={() => setPanelOpen(true)}
            className="map-panel-toggle absolute left-4 top-[4.5rem] z-30 flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 text-sm font-medium shadow-lg backdrop-blur-sm"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
            whileTap={{ scale: 0.97 }}
          >
            <Search className="h-4 w-4" />
            Explore
            <ChevronRight className="h-3 w-3" />
          </m.button>
        ) : null}
      </AnimatePresence>

      <m.div
        className="map-stats absolute bottom-4 left-1/2 z-30 border"
        initial={{ opacity: 0, y: 10, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: compactViewport ? 0 : '-50%' }}
        transition={{ delay: 0.18, duration: 0.42 }}
      >
        <dl>
          <div>
            <dt>Countries</dt>
            <dd>{stats.countries}</dd>
          </div>
          <div>
            <dt>States</dt>
            <dd>{stats.states.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Cities</dt>
            <dd>{stats.cities.toLocaleString()}</dd>
          </div>
        </dl>
      </m.div>

      <AnimatePresence initial={false}>
        {panelOpen ? (
          <m.aside
            key="map-explorer-panel"
            className="map-explorer-panel absolute left-4 top-[4.5rem] z-30 flex max-h-[calc(100svh-8.5rem)] w-80 flex-col overflow-hidden border"
            data-boundary-level={boundaryLevel}
            data-boundary-features={boundaryLayer?.data.features.length ?? 0}
            initial={
              reduceMotion
                ? { opacity: 0 }
                : compactViewport
                  ? { opacity: 0, y: 56 }
                  : { opacity: 0, x: -28 }
            }
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : compactViewport
                  ? { opacity: 0, y: 72 }
                  : { opacity: 0, x: -24 }
            }
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            drag={compactViewport ? 'y' : false}
            dragControls={panelDragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={(_, info) => {
              if (compactViewport && (info.offset.y > 120 || info.velocity.y > 700)) {
                setPanelOpen(false);
              }
            }}
          >
            <button
              type="button"
              className="explorer-sheet-handle"
              aria-label="Drag down to close Explore"
              onPointerDown={(event) => panelDragControls.start(event)}
            >
              <span />
            </button>
            <header className="map-explorer-header">
              <div className="explorer-heading">
                <h1>Explore</h1>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="explorer-close"
                aria-label="Close explorer"
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="explorer-scroll">
              <section className="explorer-section explorer-location-section">
                <SearchableLocationSelect
                  id="country-search"
                  label="Country"
                  items={countries}
                  value={selectedCountry}
                  search={countrySearch}
                  placeholder="Search 250 countries"
                  allItemsLabel="All countries"
                  active={activeStep === 'country'}
                  onSearchChange={setCountrySearch}
                  onValueChange={setSelectedCountry}
                  getSearchText={(country) =>
                    [
                      country.name,
                      getCountryDisplayName(country),
                      country.native,
                      country.iso2,
                      country.iso3,
                    ].join(' ')
                  }
                  getItemLabel={getCountryDisplayName}
                  formatValue={getCountryDisplayName}
                  renderLeading={(country) => (
                    <CountryFlag
                      code={country.iso2}
                      label={`${getCountryDisplayName(country)} flag`}
                    />
                  )}
                  renderDescription={(country) => country.region || 'Worldwide'}
                  renderTrailing={(country) => country.iso2}
                  emptyMessage={(query) => `No country matches “${query}”.`}
                />

                {selectedCountry && statesLoading ? (
                  <p className="explorer-loading-line">Loading administrative areas…</p>
                ) : null}

                {states.length > 0 ? (
                  <SearchableLocationSelect
                    id="state-search"
                    label="State / Province"
                    items={states}
                    value={selectedState}
                    search={stateSearch}
                    placeholder={`Search ${states.length.toLocaleString()} areas`}
                    allItemsLabel="All areas"
                    active={activeStep === 'state'}
                    onSearchChange={setStateSearch}
                    onValueChange={setSelectedState}
                    getSearchText={(state) =>
                      [
                        state.name,
                        getStateDisplay(state).name,
                        state.stateCode,
                        state.type || '',
                        getStateDisplay(state).type || '',
                      ].join(' ')
                    }
                    getItemLabel={(state) => getStateDisplay(state).name}
                    renderDescription={(state) => getStateDisplay(state).type}
                    renderTrailing={(state) => state.stateCode || '—'}
                    emptyMessage={(query) => `No administrative area matches “${query}”.`}
                  />
                ) : null}

                {selectedCountry && citiesLoading ? (
                  <p className="explorer-loading-line" role="status">
                    Loading {selectedCountry.iso2} city shard…
                  </p>
                ) : null}

                {selectedCountry && cityLoadError ? (
                  <div className="explorer-loading-line" role="alert">
                    <span>City data could not be loaded.</span>{' '}
                    <button type="button" onClick={() => setCityLoadAttempt((value) => value + 1)}>
                      Retry
                    </button>
                  </div>
                ) : null}

                {selectedState && !citiesLoading && !cityLoadError && cities.length === 0 ? (
                  <p className="explorer-loading-line">No published places for this area.</p>
                ) : null}

                {cities.length > 0 && !citiesLoading ? (
                  <SearchableLocationSelect
                    id="city-search"
                    label="City"
                    items={cities}
                    value={selectedCity}
                    search={citySearch}
                    placeholder={`Search ${cities.length.toLocaleString()} places`}
                    allItemsLabel="All cities"
                    active={activeStep === 'city'}
                    onSearchChange={setCitySearch}
                    onValueChange={setSelectedCity}
                    getSearchText={(city) =>
                      [
                        city.name,
                        getCityDisplayName(city),
                        getPlaceDisplay(city).type || '',
                        city.stateName,
                        city.wikiDataId,
                      ].join(' ')
                    }
                    getItemLabel={getCityDisplayName}
                    renderDescription={(city) => getPlaceDisplay(city).type}
                    renderTrailing={() => <MapPin aria-hidden="true" />}
                    emptyMessage={(query) => `No city matches “${query}”.`}
                  />
                ) : null}

                {/* Actions appear with a selection rather than sitting disabled. */}
                {hasSelection ? (
                  <div className="explorer-actions">
                    <Button variant="ghost" size="lg" onClick={clearAll}>
                      <RotateCcw aria-hidden="true" /> Reset
                    </Button>
                    <Button size="lg" onClick={locateOnMap}>
                      <MapPinned aria-hidden="true" /> Focus
                    </Button>
                  </div>
                ) : null}
              </section>

              <AnimatePresence initial={false}>
                {selectedCountry ? (
                  <m.section
                    key={`${selectedCountry.id}-${selectedState?.id ?? 'country'}-${selectedCity?.id ?? 'state'}`}
                    className="explorer-section explorer-details"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="explorer-section-heading">
                      <span>Selected record</span>
                      <small>{selectedCountry.iso3}</small>
                    </div>
                    <div className="explorer-record-title">
                      <CountryFlag
                        code={selectedCountry.iso2}
                        label={`${selectedCountryDisplayName} flag`}
                      />
                      <div>
                        <strong>
                          {selectedCityDisplayName ||
                            selectedStateDisplay?.name ||
                            selectedCountryDisplayName}
                        </strong>
                        <small>
                          {selectedCity
                            ? [
                                selectedCity ? getPlaceDisplay(selectedCity).type : null,
                                selectedStateDisplay?.name,
                                selectedCountryDisplayName,
                              ]
                                .filter(Boolean)
                                .join(' · ')
                            : selectedState
                              ? [selectedStateDisplay?.type, selectedCountryDisplayName]
                                  .filter(Boolean)
                                  .join(' · ')
                              : [selectedCountry.native, selectedCountry.iso2]
                                  .filter(Boolean)
                                  .join(' · ')}
                        </small>
                      </div>
                    </div>
                    <dl className="explorer-ledger">
                      {selectedCountry.capital ? (
                        <div>
                          <dt>Capital</dt>
                          <dd>{selectedCountry.capital}</dd>
                        </div>
                      ) : null}
                      {selectedCountry.currency ? (
                        <div>
                          <dt>Currency</dt>
                          <dd>{selectedCountry.currency}</dd>
                        </div>
                      ) : null}
                      {selectedCountry.phoneCode ? (
                        <div>
                          <dt>Calling code</dt>
                          <dd>+{selectedCountry.phoneCode}</dd>
                        </div>
                      ) : null}
                      {selectedState?.stateCode ? (
                        <div>
                          <dt>State code</dt>
                          <dd>{selectedState.stateCode}</dd>
                        </div>
                      ) : null}
                      {selectedCoordinates?.[0] != null && selectedCoordinates?.[1] != null ? (
                        <div>
                          <dt>Coordinates</dt>
                          <dd>
                            {Number(selectedCoordinates[0]).toFixed(4)},{' '}
                            {Number(selectedCoordinates[1]).toFixed(4)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    {correctionUrl ? (
                      <a
                        href={correctionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="explorer-correction-link"
                      >
                        <MessageSquarePlus aria-hidden="true" />
                        <span>
                          <strong>Suggest a correction</strong>
                          <small>{correctionPublicId} · source required</small>
                        </span>
                        <ArrowRight aria-hidden="true" />
                      </a>
                    ) : null}
                  </m.section>
                ) : null}
              </AnimatePresence>

              {/*
                Only shown once a country is picked — there is nothing to
                re-draw before that. Countries without polygon coverage get a
                one-line note instead of two permanently dead buttons.
              */}
              {selectedCountry ? (
                <section className="explorer-section explorer-boundaries">
                  <div className="explorer-section-heading">
                    <span>Map layer</span>
                  </div>
                  {hasPolygonCoverage ? (
                    <Tabs
                      value={boundaryLevel}
                      onValueChange={(value) => setBoundaryLevel(value as BoundaryLevel)}
                    >
                      <TabsList className="w-full" aria-label="Map representation">
                        {(
                          [
                            ['points', 'Centers'],
                            ['admin1', 'Provinces'],
                            ['admin2', 'Districts'],
                          ] as const
                        ).map(([value, label]) => (
                          <TabsTrigger key={value} value={value} className="text-xs">
                            {label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  ) : (
                    <p className="boundary-availability">
                      Center points. Province and district polygons are available for the Türkiye
                      pilot.
                    </p>
                  )}

                  {selectedCountry?.iso2 === 'TR' && boundaryLevel !== 'points' ? (
                    <>
                      {/*
                        Detail is a fidelity/size trade-off, not a peer of the
                        layer choice — a second identical pill row read as a
                        duplicate control, so it collapses to one labelled line.
                      */}
                      <label className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">Detail</span>
                        <Select
                          value={boundaryProfile}
                          onValueChange={(value) => setBoundaryProfile(value as BoundaryProfileKey)}
                        >
                          <SelectTrigger size="sm" className="min-w-[9.5rem]">
                            <SelectValue>
                              {(value: string) => BOUNDARY_PROFILE_LABELS[value] ?? value}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.entries(BOUNDARY_PROFILE_LABELS) as Array<
                                [BoundaryProfileKey, string]
                              >
                            ).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                <span>{label}</span>
                                <span className="ml-auto font-mono text-[0.62rem] text-muted-foreground">
                                  {boundaryCountry
                                    ? formatBytes(boundaryCountry.profiles[value].bytes)
                                    : '—'}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                      {boundaryLoading ? (
                        <p className="explorer-loading-line" role="status">
                          Loading {boundaryProfile} boundary profile…
                        </p>
                      ) : null}
                      {boundaryError ? (
                        <div className="explorer-loading-line" role="alert">
                          <span>Boundary layer could not be loaded.</span>{' '}
                          <button
                            type="button"
                            onClick={() => setBoundaryLoadAttempt((value) => value + 1)}
                          >
                            Retry
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {boundaryCountry ? (
                    <div className="boundary-meta">
                      <div>
                        <Layers3 aria-hidden="true" />
                        <span>
                          <strong>81 provinces · 922 districts</strong>
                          <small>
                            {boundaryCountry.source.attribution} · {boundaryCountry.source.license}
                          </small>
                        </span>
                      </div>
                      <div className="boundary-downloads">
                        <a href={boundaryCountry.downloads.admin1.url} download>
                          <Download aria-hidden="true" /> Admin-1 GeoJSON
                        </a>
                        <a href={boundaryCountry.downloads.admin2.url} download>
                          <Download aria-hidden="true" /> Admin-2 GeoJSON
                        </a>
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {/* A way in when nothing is picked yet; noise once something is. */}
              {!selectedCountry ? (
                <section className="explorer-section">
                  <div className="explorer-section-heading">
                    <span>Collections</span>
                  </div>
                  {(
                    [
                      [Globe, 'Country sample', '10 center points', handleShowMultipleCountries],
                      [Building, 'World capitals', '20 capital locations', handleShowCapitals],
                    ] as const
                  ).map(([Icon, title, detail, onSelect]) => (
                    <Button
                      key={title}
                      variant="ghost"
                      onClick={onSelect}
                      className="group h-auto w-full justify-start gap-3 px-2 py-3"
                    >
                      <Icon aria-hidden="true" className="text-primary" />
                      <span className="flex min-w-0 flex-col items-start gap-0.5">
                        <span className="text-[0.78rem] font-semibold">{title}</span>
                        <span className="text-[0.62rem] font-normal text-muted-foreground">
                          {detail}
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      />
                    </Button>
                  ))}
                </section>
              ) : null}
            </div>
          </m.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} kB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
