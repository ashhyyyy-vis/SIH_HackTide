import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { useLanguageStore } from '../store/languageStore';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Partner {
  id: number;
  name: string;
  partner_type: string;
  npa_percentage: number;
  allocated_funds: number;
  utilized_funds: number;
  address: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  is_eligible: boolean;
  distance_km: number;
}

const PartnerMap: React.FC = () => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(25);
  const [maxNpa, setMaxNpa] = useState(10.0);
  const { language } = useLanguageStore();

  // Default location (Delhi)
  const defaultLocation = { lat: 28.6139, lng: 77.2090 };

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error, using default location');
          setUserLocation(defaultLocation);
        }
      );
    } else {
      setUserLocation(defaultLocation);
    }
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyPartners();
    }
  }, [userLocation, radius, maxNpa, language]);

  const fetchNearbyPartners = async () => {
    if (!userLocation) return;

    setLoading(true);
    try {
      const response = await axios.get('/api/partners/nearby', {
        params: {
          lat: userLocation.lat,
          lng: userLocation.lng,
          radius_km: radius,
          max_npa: maxNpa,
          lang: language
        }
      });
      setPartners(response.data.partners);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoute = async (partner: Partner) => {
    if (!userLocation) return;

    try {
      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${partner.longitude},${partner.latitude}?overview=full&geometries=geojson`
      );
      
      if (response.data.code === 'Ok' && response.data.routes.length > 0) {
        setRoute(response.data.routes[0].geometry);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const handleMarkerClick = (partner: Partner) => {
    setSelectedPartner(partner);
    if (partner.is_eligible) {
      fetchRoute(partner);
    } else {
      setRoute(null);
    }
  };

  const createCustomIcon = (isEligible: boolean) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${isEligible ? '#22c55e' : '#9ca3af'}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });
  };

  const RoutePolyline: React.FC<{ route: any }> = ({ route }) => {
    const map = useMap();
    
    useEffect(() => {
      if (route && route.coordinates) {
        const latLngs = route.coordinates.map((coord: any) => [coord[1], coord[0]]);
        const polyline = L.polyline(latLngs, { color: '#3b82f6', weight: 5 }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        
        return () => {
          map.removeLayer(polyline);
        };
      }
    }, [route, map]);

    return null;
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white p-4 shadow-md z-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Nearby Channel Partners</h2>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Radius (km):</label>
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-300 rounded"
              min="1"
              max="100"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Max NPA (%):</label>
            <input
              type="number"
              value={maxNpa}
              onChange={(e) => setMaxNpa(Number(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-300 rounded"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          
          <button
            onClick={fetchNearbyPartners}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition"
          >
            Search
          </button>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Eligible Partner</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
            <span>Ineligible Partner</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {userLocation && (
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* User location marker */}
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>Your Location</Popup>
            </Marker>

            {/* Partner markers */}
            {partners.map((partner) => (
              <Marker
                key={partner.id}
                position={[partner.latitude, partner.longitude]}
                icon={createCustomIcon(partner.is_eligible)}
                eventHandlers={{
                  click: () => handleMarkerClick(partner)
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg">{partner.name}</h3>
                    <p className="text-sm text-gray-600">{partner.partner_type}</p>
                    <p className="text-sm">{partner.address}, {partner.district}</p>
                    <p className="text-sm">Distance: {partner.distance_km.toFixed(2)} km</p>
                    <p className="text-sm">NPA: {partner.npa_percentage}%</p>
                    {!partner.is_eligible && (
                      <p className="text-sm text-red-600 font-semibold mt-2">
                        Currently ineligible due to high NPA defaults
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Route polyline */}
            {route && <RoutePolyline route={route} />}
          </MapContainer>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading partners...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerMap;
