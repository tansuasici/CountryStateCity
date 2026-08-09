'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AttributionControl,
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection, Geometry } from 'geojson';
import type { City, Country, State } from '@/types';

type MapColorMode = 'light' | 'dark';

const HOME_VIEW = { center: [18, 21] as [number, number], zoom: 1.65, pitch: 13, bearing: -6 };
const MOBILE_HOME_VIEW = {
  center: [18, 21] as [number, number],
  zoom: 1.22,
  pitch: 8,
  bearing: -6,
};
const INITIAL_VIEW = {
  center: [8, 17] as [number, number],
  zoom: 0.95,
  pitch: 0,
  bearing: -14,
};

function createMapStyle(mode: MapColorMode): StyleSpecification {
  const dark = mode === 'dark';
  const cartoStyle = dark ? 'dark_all' : 'light_all';

  return {
    version: 8,
    projection: { type: 'globe' },
    sources: {
      basemap: {
        type: 'raster',
        tiles: [
          `https://a.basemaps.cartocdn.com/${cartoStyle}/{z}/{x}/{y}@2x.png`,
          `https://b.basemaps.cartocdn.com/${cartoStyle}/{z}/{x}/{y}@2x.png`,
          `https://c.basemaps.cartocdn.com/${cartoStyle}/{z}/{x}/{y}@2x.png`,
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
      [BOUNDARY_SOURCE_ID]: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
    },
    layers: [
      {
        id: 'space',
        type: 'background',
        paint: { 'background-color': dark ? '#020806' : '#e9e6dc' },
      },
      {
        id: 'basemap',
        type: 'raster',
        source: 'basemap',
        paint: {
          'raster-opacity': dark ? 0.98 : 0.97,
          'raster-saturation': dark ? -0.32 : -0.12,
          'raster-contrast': dark ? 0.12 : 0.1,
          'raster-brightness-min': dark ? 0.1 : 0.2,
          'raster-brightness-max': dark ? 0.88 : 0.94,
        },
      },
      {
        id: BOUNDARY_FILL_LAYER_ID,
        type: 'fill',
        source: BOUNDARY_SOURCE_ID,
        layout: { visibility: 'none' },
        paint: { 'fill-color': dark ? '#66e36f' : '#28775f', 'fill-opacity': 0.2 },
      },
      {
        id: BOUNDARY_LINE_LAYER_ID,
        type: 'line',
        source: BOUNDARY_SOURCE_ID,
        layout: { visibility: 'none' },
        paint: {
          'line-color': dark ? '#9dff87' : '#145c48',
          'line-opacity': dark ? 0.9 : 0.72,
          'line-width': 1.4,
        },
      },
      {
        id: BOUNDARY_SELECTED_LAYER_ID,
        type: 'line',
        source: BOUNDARY_SOURCE_ID,
        layout: { visibility: 'none' },
        filter: ['==', ['get', 'id'], -1],
        paint: {
          'line-color': dark ? '#f1ffd9' : '#071715',
          'line-opacity': 0.98,
          'line-width': 2.5,
        },
      },
    ],
    sky: {
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, dark ? 1 : 0.48, 5, 0.7, 7, 0],
    },
  };
}

function getViewportFrame(compact: boolean) {
  return compact ? MOBILE_HOME_VIEW : HOME_VIEW;
}

function getViewportPadding(panelOpen: boolean, compact: boolean) {
  return {
    left: panelOpen && !compact ? 384 : 0,
    right: compact ? 0 : 48,
    top: compact ? 20 : 24,
    bottom: compact ? 96 : 84,
  };
}

export interface MapMarker {
  lat: number;
  lng: number;
  name: string;
  type: 'country' | 'state' | 'city';
  data?: Country | State | City;
}

interface WorldMapProps {
  selectedCountry?: Country | null;
  selectedState?: State | null;
  selectedCity?: City | null;
  markers?: MapMarker[];
  height?: string;
  panelOpen?: boolean;
  boundaryData?: FeatureCollection<Geometry> | null;
  boundaryLevel?: 'admin1' | 'admin2' | null;
  boundarySelectionId?: number | null;
  showPoints?: boolean;
  onMapReady?: (map: MapLibreMap) => void;
}

export default function WorldMap({
  selectedCountry,
  selectedState,
  selectedCity,
  markers = [],
  height = '500px',
  panelOpen = false,
  boundaryData = null,
  boundaryLevel = null,
  boundarySelectionId = null,
  showPoints = true,
  onMapReady,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const initialFrameDoneRef = useRef(false);
  const appliedColorModeRef = useRef<MapColorMode | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [colorMode, setColorMode] = useState<MapColorMode>('dark');

  useEffect(() => {
    const root = document.documentElement;
    const syncColorMode = () => setColorMode(root.classList.contains('dark') ? 'dark' : 'light');
    syncColorMode();

    const observer = new MutationObserver(syncColorMode);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');

    const initialColorMode: MapColorMode = document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';
    const map = new MapLibreMap({
      container: containerRef.current,
      style: createMapStyle(initialColorMode),
      ...INITIAL_VIEW,
      minZoom: 0.6,
      maxZoom: 16,
      maxPitch: 75,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    });

    mapRef.current = map;
    appliedColorModeRef.current = initialColorMode;
    const loadTimeout = window.setTimeout(() => setLoadFailed(true), 15000);
    map.addControl(
      new NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }),
      'top-right'
    );
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');

    const updateMarkerOcclusion = () => updateMarkerVisibility(map, markerRefs.current);
    map.on('move', updateMarkerOcclusion);

    map.once('load', () => {
      window.clearTimeout(loadTimeout);
      map.setProjection({ type: 'globe' });
      setIsReady(true);
      onMapReady?.(map);
    });

    return () => {
      window.clearTimeout(loadTimeout);
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [onMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    const compact = window.matchMedia('(max-width: 900px)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const firstFrame = !initialFrameDoneRef.current;
    initialFrameDoneRef.current = true;
    map.easeTo({
      ...(firstFrame ? getViewportFrame(compact) : {}),
      padding: getViewportPadding(panelOpen, compact),
      duration: reducedMotion ? 0 : firstFrame ? 1250 : 520,
      essential: true,
    });
  }, [isReady, panelOpen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || appliedColorModeRef.current === colorMode) return;

    appliedColorModeRef.current = colorMode;
    map.setStyle(createMapStyle(colorMode));
    map.once('style.load', () => map.setProjection({ type: 'globe' }));
  }, [colorMode, isReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    const sync = () =>
      syncBoundaryLayers(map, boundaryData, boundaryLevel, boundarySelectionId, colorMode);
    try {
      sync();
    } catch {
      map.once('style.load', sync);
    }
    return () => {
      map.off('style.load', sync);
    };
  }, [boundaryData, boundaryLevel, boundarySelectionId, colorMode, isReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    const activeMarkers = showPoints ? [...markers] : [];
    const selectedMarker = getSelectedMarker(selectedCountry, selectedState, selectedCity);
    if (selectedMarker && showPoints) activeMarkers.push(selectedMarker);

    markerRefs.current = activeMarkers.map((marker) => createMarker(map, marker));
    updateMarkerVisibility(map, markerRefs.current);

    if (selectedMarker) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.flyTo({
        center: [selectedMarker.lng, selectedMarker.lat],
        zoom: selectedMarker.type === 'city' ? 11 : selectedMarker.type === 'state' ? 6.5 : 4.2,
        pitch: selectedMarker.type === 'city' ? 58 : selectedMarker.type === 'state' ? 45 : 30,
        bearing: selectedMarker.type === 'country' ? -12 : 18,
        duration: reducedMotion ? 0 : 1800,
        essential: true,
      });
    } else if (activeMarkers.length > 1) {
      const compact = window.matchMedia('(max-width: 900px)').matches;
      map.flyTo({ ...getViewportFrame(compact), duration: 1200, essential: true });
    }
  }, [isReady, markers, selectedCity, selectedCountry, selectedState, showPoints]);

  return (
    <div
      style={{ height }}
      className={`world-map-3d ${panelOpen ? 'has-panel' : ''}`}
      data-map-theme={colorMode}
    >
      <div ref={containerRef} className="h-full w-full" aria-label="Interactive 3D world map" />
      {!isReady && !loadFailed ? (
        <div className="map-loading" role="status">
          <span />
          <p>Preparing</p>
        </div>
      ) : null}
      {loadFailed ? (
        <div className="map-loading map-loading-error" role="alert">
          <p>Map tiles could not be loaded.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      ) : null}
      <p className="map-interaction-hint" aria-hidden="true">
        Drag to rotate <i /> Scroll to zoom
      </p>
    </div>
  );
}

const BOUNDARY_SOURCE_ID = 'csc-boundaries';
const BOUNDARY_FILL_LAYER_ID = 'csc-boundaries-fill';
const BOUNDARY_LINE_LAYER_ID = 'csc-boundaries-line';
const BOUNDARY_SELECTED_LAYER_ID = 'csc-boundaries-selected';

function syncBoundaryLayers(
  map: MapLibreMap,
  data: FeatureCollection<Geometry> | null,
  level: 'admin1' | 'admin2' | null,
  selectedId: number | null,
  colorMode: MapColorMode
) {
  if (!data || !level) {
    const source = map.getSource(BOUNDARY_SOURCE_ID);
    if (source) {
      (source as GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
    }
    for (const layerId of [
      BOUNDARY_SELECTED_LAYER_ID,
      BOUNDARY_LINE_LAYER_ID,
      BOUNDARY_FILL_LAYER_ID,
    ]) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none');
    }
    delete map.getContainer().dataset.boundaryLayer;
    return;
  }

  const source = map.getSource(BOUNDARY_SOURCE_ID);
  if (source) (source as GeoJSONSource).setData(data);
  else map.addSource(BOUNDARY_SOURCE_ID, { type: 'geojson', data });

  const dark = colorMode === 'dark';
  if (!map.getLayer(BOUNDARY_FILL_LAYER_ID)) {
    map.addLayer({
      id: BOUNDARY_FILL_LAYER_ID,
      type: 'fill',
      source: BOUNDARY_SOURCE_ID,
      paint: {
        'fill-color': dark ? '#66e36f' : '#28775f',
        'fill-opacity': level === 'admin1' ? 0.22 : 0.12,
      },
    });
  }
  if (!map.getLayer(BOUNDARY_LINE_LAYER_ID)) {
    map.addLayer({
      id: BOUNDARY_LINE_LAYER_ID,
      type: 'line',
      source: BOUNDARY_SOURCE_ID,
      paint: {
        'line-color': dark ? '#9dff87' : '#145c48',
        'line-opacity': dark ? 0.9 : 0.72,
        'line-width': level === 'admin1' ? 1.4 : 0.9,
      },
    });
  }
  if (!map.getLayer(BOUNDARY_SELECTED_LAYER_ID)) {
    map.addLayer({
      id: BOUNDARY_SELECTED_LAYER_ID,
      type: 'line',
      source: BOUNDARY_SOURCE_ID,
      filter: ['==', ['get', 'id'], selectedId ?? -1],
      paint: {
        'line-color': dark ? '#f1ffd9' : '#071715',
        'line-opacity': 0.98,
        'line-width': 2.5,
      },
    });
  } else {
    map.setFilter(BOUNDARY_SELECTED_LAYER_ID, ['==', ['get', 'id'], selectedId ?? -1]);
  }
  map.setPaintProperty(BOUNDARY_FILL_LAYER_ID, 'fill-color', dark ? '#66e36f' : '#28775f');
  map.setPaintProperty(BOUNDARY_FILL_LAYER_ID, 'fill-opacity', level === 'admin1' ? 0.22 : 0.12);
  map.setPaintProperty(BOUNDARY_LINE_LAYER_ID, 'line-color', dark ? '#9dff87' : '#145c48');
  map.setPaintProperty(BOUNDARY_LINE_LAYER_ID, 'line-opacity', dark ? 0.9 : 0.72);
  map.setPaintProperty(BOUNDARY_LINE_LAYER_ID, 'line-width', level === 'admin1' ? 1.4 : 0.9);
  map.setPaintProperty(BOUNDARY_SELECTED_LAYER_ID, 'line-color', dark ? '#f1ffd9' : '#071715');
  for (const layerId of [
    BOUNDARY_FILL_LAYER_ID,
    BOUNDARY_LINE_LAYER_ID,
    BOUNDARY_SELECTED_LAYER_ID,
  ]) {
    map.setLayoutProperty(layerId, 'visibility', 'visible');
  }
  map.getContainer().dataset.boundaryLayer = `${level}:${data.features.length}`;
  map.triggerRepaint();
}

function getSelectedMarker(
  country?: Country | null,
  state?: State | null,
  city?: City | null
): MapMarker | null {
  if (city?.latitude && city?.longitude) {
    return {
      lat: Number(city.latitude),
      lng: Number(city.longitude),
      name: city.name,
      type: 'city',
      data: city,
    };
  }
  if (state?.latitude && state?.longitude) {
    return {
      lat: Number(state.latitude),
      lng: Number(state.longitude),
      name: state.name,
      type: 'state',
      data: state,
    };
  }
  if (country?.latitude && country?.longitude) {
    return {
      lat: Number(country.latitude),
      lng: Number(country.longitude),
      name: country.name,
      type: 'country',
      data: country,
    };
  }
  return null;
}

function createMarker(map: MapLibreMap, marker: MapMarker) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `map-marker map-marker-${marker.type}`;
  element.setAttribute('aria-label', `${marker.name}, ${marker.type}`);
  element.innerHTML = '<span></span><i></i>';

  const popupBody = document.createElement('div');
  popupBody.className = 'map-popup';
  const eyebrow = document.createElement('span');
  eyebrow.textContent = marker.type;
  const title = document.createElement('strong');
  title.textContent = marker.name;
  const coordinates = document.createElement('code');
  coordinates.textContent = `${marker.lat.toFixed(4)}°, ${marker.lng.toFixed(4)}°`;
  popupBody.append(eyebrow, title, coordinates);

  if (marker.data && 'capital' in marker.data && marker.data.capital) {
    const detail = document.createElement('small');
    detail.textContent = `Capital · ${marker.data.capital}`;
    popupBody.append(detail);
  }

  const popup = new Popup({
    offset: 24,
    closeButton: false,
    className: 'map-popup-shell',
  }).setDOMContent(popupBody);

  return new Marker({
    element,
    anchor: 'center',
    opacityWhenCovered: 0,
    subpixelPositioning: true,
  })
    .setLngLat([marker.lng, marker.lat])
    .setPopup(popup)
    .addTo(map);
}

function updateMarkerVisibility(map: MapLibreMap, markerInstances: Marker[]) {
  const center = map.getCenter();
  const centerLatitude = (center.lat * Math.PI) / 180;
  const centerLongitude = (center.lng * Math.PI) / 180;

  markerInstances.forEach((marker) => {
    const position = marker.getLngLat();
    const latitude = (position.lat * Math.PI) / 180;
    const longitude = (position.lng * Math.PI) / 180;
    const hemisphereDot =
      Math.sin(centerLatitude) * Math.sin(latitude) +
      Math.cos(centerLatitude) * Math.cos(latitude) * Math.cos(longitude - centerLongitude);
    // MapLibre's DOM projection diverges from the rendered sphere near the horizon.
    // Keep DOM markers inside a safe front-facing cap so they never drift into space.
    const isOccluded = hemisphereDot < 0.84;
    const element = marker.getElement();

    element.classList.toggle('map-marker-occluded', isOccluded);
    element.tabIndex = isOccluded ? -1 : 0;
    if (isOccluded) {
      element.setAttribute('aria-hidden', 'true');
      if (element.isConnected) marker.remove();
    } else {
      element.removeAttribute('aria-hidden');
      if (!element.isConnected) marker.addTo(map);
    }
  });
}
