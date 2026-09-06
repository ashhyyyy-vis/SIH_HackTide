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
      html: `<div style="background-color: ${isEligible ? 'var(--success)' : 'var(--n-300)'}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });
  };

  const RoutePolyline: React.FC<{ route: any }> = ({ route }) => {
    const map = useMap();
    
    useEffect(() => {
      if (route && route.coordinates) {
        const latLngs = route.coordinates.map((coord: any) => [coord[1], coord[0]]);
        const polyline = L.polyline(latLngs, { color: 'var(--primary-600)', weight: 5 }).addTo(map);
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
      <div style={{ background: 'var(--bg-surface)', padding: 'var(--s4)', boxShadow: 'var(--shadow-sm)', zIndex: 10 }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--n-900)', marginBottom: 'var(--s4)' }}>Nearby Channel Partners</h2>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--n-700)' }}>Radius (km):</label>
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              style={{
                width: '80px',
                height: 'var(--tap)',
                border: '1px solid var(--n-300)',
                borderRadius: 'var(--r-md)',
                background: 'var(--n-0)',
                color: 'var(--n-900)',
                padding: '0 var(--s3)',
                fontSize: '16px'
              }}
              min="1"
              max="100"
            />
          </div>
          
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--n-700)' }}>Max NPA (%):</label>
            <input
              type="number"
              value={maxNpa}
              onChange={(e) => setMaxNpa(Number(e.target.value))}
              style={{
                width: '80px',
                height: 'var(--tap)',
                border: '1px solid var(--n-300)',
                borderRadius: 'var(--r-md)',
                background: 'var(--n-0)',
                color: 'var(--n-900)',
                padding: '0 var(--s3)',
                fontSize: '16px'
              }}
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          
          <button
            onClick={fetchNearbyPartners}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--s2)',
              height: 'var(--tap)',
              padding: '0 20px',
              minWidth: '120px',
              borderRadius: 'var(--r-md)',
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: 1.2,
              border: '1.5px solid transparent',
              cursor: 'pointer',
              background: 'var(--primary-600)',
              color: 'var(--n-0)'
            }}
          >
            Search
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--s3)', fontSize: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--success)' }}></div>
            <span>Eligible Partner</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--n-300)' }}></div>
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
                  <div style={{ padding: '8px' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '18px', color: 'var(--n-900)' }}>{partner.name}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--n-700)' }}>{partner.partner_type}</p>
                    <p style={{ fontSize: '14px', color: 'var(--n-700)' }}>{partner.address}, {partner.district}</p>
                    <p style={{ fontSize: '14px', color: 'var(--n-700)' }}>Distance: {partner.distance_km.toFixed(2)} km</p>
                    <p style={{ fontSize: '14px', color: 'var(--n-700)' }}>NPA: {partner.npa_percentage}%</p>
                    {!partner.is_eligible && (
                      <p style={{ fontSize: '14px', color: 'var(--error-text)', fontWeight: 600, marginTop: '8px' }}>
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
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.75)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--primary-600)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
              <p style={{ marginTop: '16px', color: 'var(--n-700)' }}>Loading partners...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerMap;
