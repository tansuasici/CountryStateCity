'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardBody, Button, Chip, Spinner } from '@heroui/react';
import { MapPin, Globe, ZoomIn, ZoomOut, Home } from 'lucide-react';
import { Country, State, City } from '@/types';

// Leaflet'i dinamik olarak yükle (SSR problemlerini önlemek için)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><Spinner /></div> }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);


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

// useMap hook'unu dinamik olarak yüklemek için
const MapControlsInner = dynamic(() => 
  import('react-leaflet').then(mod => {
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
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            className="bg-white/90 backdrop-blur"
            onPress={() => map.zoomIn()}
          >
            <ZoomIn size={18} />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            className="bg-white/90 backdrop-blur"
            onPress={() => map.zoomOut()}
          >
            <ZoomOut size={18} />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            className="bg-white/90 backdrop-blur"
            onPress={() => map.setView([20, 0], 2)}
          >
            <Home size={18} />
          </Button>
        </div>
      );
    };
  }), 
  { ssr: false }
);

// Fallback component
function MapControls({ onMapReady }: { onMapReady?: (map: any) => void }) {
  return <MapControlsInner onMapReady={onMapReady} />;
}

export default function WorldMap({ 
  selectedCountry, 
  selectedState, 
  selectedCity,
  markers = [],
  height = "500px",
  onMapReady
}: WorldMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Leaflet'i client-side'da yükle ve icon ayarlarını düzelt
    import('leaflet').then((leaflet) => {
      // Default icon ayarları
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    });
  }, []);

  // Harita merkezi ve zoom seviyesini belirle
  const getMapConfig = () => {
    if (selectedCity && selectedCity.latitude && selectedCity.longitude) {
      return {
        center: [parseFloat(selectedCity.latitude), parseFloat(selectedCity.longitude)] as [number, number],
        zoom: 10
      };
    } else if (selectedState && selectedState.latitude && selectedState.longitude) {
      return {
        center: [parseFloat(selectedState.latitude), parseFloat(selectedState.longitude)] as [number, number],
        zoom: 7
      };
    } else if (selectedCountry && selectedCountry.latitude && selectedCountry.longitude) {
      return {
        center: [parseFloat(selectedCountry.latitude), parseFloat(selectedCountry.longitude)] as [number, number],
        zoom: 5
      };
    }
    return {
      center: [20, 0] as [number, number],
      zoom: 2
    };
  };

  const { center, zoom } = getMapConfig();

  // Marker'ları hazırla - sadece en spesifik lokasyon için pin at
  const allMarkers = [...markers];
  
  // En spesifik seviyeyi belirle ve sadece o için marker ekle
  if (selectedCity && selectedCity.latitude && selectedCity.longitude) {
    // Şehir seçiliyse sadece şehir pin'i at
    allMarkers.push({
      lat: parseFloat(selectedCity.latitude),
      lng: parseFloat(selectedCity.longitude),
      name: selectedCity.name,
      type: 'city',
      data: selectedCity
    });
  } else if (selectedState && selectedState.latitude && selectedState.longitude) {
    // Şehir yok ama eyalet varsa eyalet pin'i at
    allMarkers.push({
      lat: parseFloat(selectedState.latitude),
      lng: parseFloat(selectedState.longitude),
      name: selectedState.name,
      type: 'state',
      data: selectedState
    });
  } else if (selectedCountry && selectedCountry.latitude && selectedCountry.longitude) {
    // Sadece ülke varsa ülke pin'i at
    allMarkers.push({
      lat: parseFloat(selectedCountry.latitude),
      lng: parseFloat(selectedCountry.longitude),
      name: selectedCountry.name,
      type: 'country',
      data: selectedCountry
    });
  }

  if (!isClient) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-default-50 rounded-lg">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ height }} className="relative rounded-lg overflow-hidden border border-divider">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapControls onMapReady={onMapReady} />
        
        {allMarkers.map((marker, index) => (
          <Marker 
            key={`${marker.type}-${index}`}
            position={[marker.lat, marker.lng]}
          >
            <Popup>
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  {marker.type === 'country' && <Globe size={16} className="text-blue-600" />}
                  {marker.type === 'state' && <MapPin size={16} className="text-green-600" />}
                  {marker.type === 'city' && <MapPin size={16} className="text-purple-600" />}
                  <Chip size="sm" color={
                    marker.type === 'country' ? 'primary' : 
                    marker.type === 'state' ? 'success' : 
                    'secondary'
                  }>
                    {marker.type}
                  </Chip>
                </div>
                <h3 className="font-semibold text-lg">{marker.name}</h3>
                {marker.data && (
                  <div className="mt-2 text-sm text-default-600">
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