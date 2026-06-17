"use client";

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons using inline SVG to avoid asset resolution errors
const createCustomIcon = (color: string, size = 30) => {
  return new L.DivIcon({
    html: `<div style="position: relative; width: ${size}px; height: ${size}px;">
             <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${color}; opacity: 0.3; animation: pulse-glow 2s infinite ease-in-out;"></div>
             <div style="position: absolute; top: 25%; left: 25%; width: 50%; height: 50%; border-radius: 50%; background-color: ${color}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
           </div>`,
    className: 'custom-leaflet-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  type: 'worker' | 'job' | 'user';
  onClick?: () => void;
}

interface MapComponentProps {
  center: [number, number];
  zoom?: number;
  markers: MapMarker[];
  interactive?: boolean;
}

// Controller component to programmatically pan/zoom the map
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function MapComponent({ center, zoom = 13, markers, interactive = true }: MapComponentProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-full bg-[#18181b] flex items-center justify-center rounded-xl border border-zinc-800 text-zinc-400">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-t-indigo-500 border-zinc-700 rounded-full animate-spin"></div>
          <span>Loading Interactive Map...</span>
        </div>
      </div>
    );
  }

  // Get color depending on marker type
  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'worker': return '#10b981'; // Emerald
      case 'job': return '#6366f1';    // Indigo
      case 'user': return '#ef4444';   // Red
      default: return '#f59e0b';       // Amber
    }
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-zinc-800 relative shadow-2xl">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={interactive} 
        className="w-full h-full"
      >
        <ChangeView center={center} zoom={zoom} />
        
        {/* Modern dark-themed map layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={createCustomIcon(getMarkerColor(marker.type))}
            eventHandlers={{
              click: () => {
                if (marker.onClick) marker.onClick();
              }
            }}
          >
            <Popup>
              <div className="p-1 min-w-[120px]">
                <h4 className="font-semibold text-zinc-100 text-sm leading-tight m-0">{marker.title}</h4>
                {marker.subtitle && (
                  <p className="text-zinc-400 text-xs mt-1 leading-normal">{marker.subtitle}</p>
                )}
                {marker.onClick && (
                  <button 
                    onClick={marker.onClick}
                    className="mt-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1 px-2 rounded-md transition duration-150 ease-in-out cursor-pointer"
                  >
                    View Details
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
export default MapComponent;
