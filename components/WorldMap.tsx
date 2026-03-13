'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Globe, ZoomIn, ZoomOut, Home } from 'lucide-react';
import { Country, State, City } from '@/types';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-fd-primary border-t-transparent rounded-full" />
    </div>
  ),
});

const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
});

const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });

const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

interface WorldMapProps {
  selectedCountry?: Country | null;
  selectedState?: State | null;
  selectedCity?: City | null;
  markers?: Array<{
    lat: number;
    lng: number;
    name: string;
    type: 'country' | 'state' | 'city';
    data?: any;
  }>;
  height?: string;
  onMapReady?: (map: any) => void;
}

const MapControlsInner = dynamic(
  () =>
    import('react-leaflet').then((mod) => {
      const useMap = mod.useMap;

      return function MapControlsComponent({ onMapReady }: { onMapReady?: (map: any) => void }) {
        const map = useMap();

        useEffect(() => {
          if (map && onMapReady) {
            onMapReady(map);
          }
        }, [map, onMapReady]);

        return (
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            <button
              onClick={() => map.zoomIn()}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 dark:bg-neutral-800/90 backdrop-blur border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-700"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => map.zoomOut()}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 dark:bg-neutral-800/90 backdrop-blur border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-700"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={() => map.setView([20, 0], 2)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 dark:bg-neutral-800/90 backdrop-blur border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-700"
            >
              <Home size={18} />
            </button>
          </div>
        );
      };
    }),
  { ssr: false }
);

function MapControls({ onMapReady }: { onMapReady?: (map: any) => void }) {
  return <MapControlsInner onMapReady={onMapReady} />;
}

export default function WorldMap({
  selectedCountry,
  selectedState,
  selectedCity,
  markers = [],
  height = '500px',
  onMapReady,
}: WorldMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    import('leaflet').then((leaflet) => {
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    });
  }, []);

  const getMapConfig = () => {
    if (selectedCity?.latitude && selectedCity?.longitude) {
      return {
        center: [parseFloat(selectedCity.latitude), parseFloat(selectedCity.longitude)] as [
          number,
          number,
        ],
        zoom: 10,
      };
    } else if (selectedState?.latitude && selectedState?.longitude) {
      return {
        center: [parseFloat(selectedState.latitude), parseFloat(selectedState.longitude)] as [
          number,
          number,
        ],
        zoom: 7,
      };
    } else if (selectedCountry?.latitude && selectedCountry?.longitude) {
      return {
        center: [parseFloat(selectedCountry.latitude), parseFloat(selectedCountry.longitude)] as [
          number,
          number,
        ],
        zoom: 5,
      };
    }
    return { center: [20, 0] as [number, number], zoom: 2 };
  };

  const { center, zoom } = getMapConfig();

  const allMarkers = [...markers];
  if (selectedCity?.latitude && selectedCity?.longitude) {
    allMarkers.push({
      lat: parseFloat(selectedCity.latitude),
      lng: parseFloat(selectedCity.longitude),
      name: selectedCity.name,
      type: 'city',
      data: selectedCity,
    });
  } else if (selectedState?.latitude && selectedState?.longitude) {
    allMarkers.push({
      lat: parseFloat(selectedState.latitude),
      lng: parseFloat(selectedState.longitude),
      name: selectedState.name,
      type: 'state',
      data: selectedState,
    });
  } else if (selectedCountry?.latitude && selectedCountry?.longitude) {
    allMarkers.push({
      lat: parseFloat(selectedCountry.latitude),
      lng: parseFloat(selectedCountry.longitude),
      name: selectedCountry.name,
      type: 'country',
      data: selectedCountry,
    });
  }

  if (!isClient) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-fd-secondary rounded-lg"
      >
        <div className="animate-spin w-8 h-8 border-2 border-fd-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div style={{ height }} className="relative rounded-lg overflow-hidden">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapControls onMapReady={onMapReady} />
        {allMarkers.map((marker, index) => (
          <Marker key={`${marker.type}-${index}`} position={[marker.lat, marker.lng]}>
            <Popup>
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  {marker.type === 'country' && <Globe size={16} className="text-blue-600" />}
                  {marker.type === 'state' && <MapPin size={16} className="text-green-600" />}
                  {marker.type === 'city' && <MapPin size={16} className="text-purple-600" />}
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100">
                    {marker.type}
                  </span>
                </div>
                <h3 className="font-semibold text-lg">{marker.name}</h3>
                {marker.data && (
                  <div className="mt-2 text-sm text-neutral-600">
                    <p>Lat: {marker.lat.toFixed(4)}</p>
                    <p>Lng: {marker.lng.toFixed(4)}</p>
                    {marker.data.capital && <p>Capital: {marker.data.capital}</p>}
                    {marker.data.currency && <p>Currency: {marker.data.currency}</p>}
                    {marker.data.phoneCode && <p>Phone: +{marker.data.phoneCode}</p>}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
