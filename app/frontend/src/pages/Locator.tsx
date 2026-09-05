import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useI18n } from '../i18n';
import { api } from '../api';
import { PARTNER_TYPES, type Branch, type FundResponse, type NearestResponse } from '../types';
import { inr } from '../format';

function healthColor(status?: string): string {
  switch (status) {
    case 'CRITICAL': return '#dc2626';
    case 'HIGH': return '#ea580c';
    case 'MEDIUM': return '#eab308';
    default: return '#16a34a';
  }
}

function markerHtml(color: string, health?: number) {
  return `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:800;">${health ?? ''}</div>`;
}

function fundColor(status?: string) {
  if (status === 'healthy') return '#16a34a';
  if (status === 'moderate') return '#ca8a04';
  if (status === 'low') return '#ea580c';
  if (status === 'exhausted') return '#dc2626';
  return '#94a3b8';
}

function FundBadge({ fund }: { fund: FundResponse | null }) {
  const { t } = useI18n();
  if (!fund) return null;
  return (
    <div className="state-fund card" style={{ marginTop: 0 }}>
      <div className="row">
        <span className="dot" style={{ background: fundColor(fund.status) }} />
        <b>{t('fundStatusTitle')} — {fund.state}</b>
      </div>
      <div className="muted mt">
        {fund.label ?? fund.status} · utilized {fund.utilization != null ? Math.round(fund.utilization * 100) + '%' : '—'}
        {fund.remaining_lakh != null && <> · {inr(fund.remaining_lakh * 100000)} remaining</>}
      </div>
    </div>
  );
}

export function Locator() {
  const { t } = useI18n();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const branchLayer = useRef<L.FeatureGroup | null>(null);
  const overlayLayer = useRef<L.FeatureGroup | null>(null);

  const [lat, setLat] = useState('12.972');
  const [lng, setLng] = useState('77.594');
  const [radius, setRadius] = useState('30');
  const [partnerType, setPartnerType] = useState('any');
  const [healthyOnly, setHealthyOnly] = useState(true);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [data, setData] = useState<NearestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fund, setFund] = useState<FundResponse | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([22.58, 82.18], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    branchLayer.current = L.featureGroup().addTo(map);
    overlayLayer.current = L.featureGroup().addTo(map);
    leafletMap.current = map;
    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  async function search(userLat = Number(lat), userLng = Number(lng)) {
    if (Number.isNaN(userLat) || Number.isNaN(userLng)) return;
    setLoading(true);
    setLocError(null);
    try {
      const res = await api.nearest({
        lat: userLat,
        lng: userLng,
        radiusKm: Number(radius) || 30,
        limit: 50,
        eligibleOnly: healthyOnly,
      });
      let branches = res?.branches ?? [];
      if (partnerType !== 'any') {
        branches = branches.filter((b) => b.partnerType === partnerType);
      }
      setData({ user: { lat: userLat, lng: userLng }, radius_km: Number(radius) || 30, total: branches.length, branches });
      setSelectedBranch(branches[0] ?? null);
      draw(userLat, userLng, branches);
      fetchFund(userLat, userLng);
    } catch {
      setLocError(t('error'));
    } finally {
      setLoading(false);
    }
  }

  async function fetchFund(ulat: number, ulng: number) {
    try {
      const nearest = await api.nearest({ lat: ulat, lng: ulng, radiusKm: 400, limit: 1 });
      const st = nearest.branches[0]?.state;
      if (st) setFund(await api.fund(st));
    } catch { /* non-critical */ }
  }

  function draw(userLat: number, userLng: number, branches: Branch[]) {
    const map = leafletMap.current;
    const bl = branchLayer.current;
    const ol = overlayLayer.current;
    if (!map || !bl || !ol) return;

    bl.clearLayers();
    ol.clearLayers();

    L.marker([userLat, userLng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 3px #2563eb55;"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    })
      .addTo(ol)
      .bindTooltip(t('youAreHere'), { permanent: false });

    L.circle([userLat, userLng], {
      radius: (Number(radius) || 30) * 1000,
      color: '#2563eb',
      opacity: 0.35,
      fillColor: '#2563eb',
      fillOpacity: 0.06,
    }).addTo(ol);

    for (const b of branches) {
      const m = L.marker([b.lat, b.lng], {
        icon: L.divIcon({
          className: '',
          html: markerHtml(healthColor(b.npa_status), b.health_score),
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      });
      m.on('click', () => setSelectedBranch(b));
      m.addTo(bl);
    }

    if (branches.length > 0) {
      map.fitBounds(bl.getBounds().pad(0.35), { maxZoom: 14 });
    } else {
      map.setView([userLat, userLng], 10);
    }
  }

  function locateMe() {
    setLocating(true);
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError(t('locationError'));
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setLat(String(la.toFixed(4)));
        setLng(String(lo.toFixed(4)));
        setLocating(false);
        await search(la, lo);
      },
      () => {
        setLocError(t('locationError'));
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>{t('locatorTitle')}</h1>
        <p>{t('locatorDesc')}</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => void locateMe()} disabled={locating}>
              {locating ? <><span className="spinner" />&nbsp;</> : '📍 '}
              {t('useMyLocation')}
            </button>
            <span className="muted">{t('orEnterCoords')}</span>
          </div>
          {locating && <p className="muted">{t('locating')}</p>}
          {locError && <div className="error-box">{locError}</div>}

          <div className="grid-2 mt">
            <label className="field">
              <span>{t('lat')}</span>
              <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)} />
            </label>
            <label className="field">
              <span>{t('lng')}</span>
              <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)} />
            </label>
          </div>

          <div className="grid-2">
            <label className="field">
              <span>{t('radiusKm')}</span>
              <input type="number" min={1} value={radius} onChange={(e) => setRadius(e.target.value)} />
            </label>
            <label className="field">
              <span>{t('partnerType')}</span>
              <select value={partnerType} onChange={(e) => setPartnerType(e.target.value)}>
                <option value="any">{t('anyType')}</option>
                {PARTNER_TYPES.map((pt) => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={healthyOnly}
              onChange={(e) => setHealthyOnly(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span style={{ margin: 0 }}>{t('healthyOnly')}</span>
          </label>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => void search()} disabled={loading}>
            {loading ? <><span className="spinner" />&nbsp;</> : null}
            {t('search')}
          </button>

          <div className="mt muted" style={{ display: 'grid', gap: 3 }}>
            <span><span className="tag low" style={{ marginRight: 6 }}>LOW</span>{t('legendLow')}</span>
            <span><span className="tag medium" style={{ marginRight: 6 }}>MED</span>{t('legendMed')}</span>
            <span><span className="tag high" style={{ marginRight: 6 }}>HIGH</span>{t('legendHigh')}</span>
            <span><span className="tag critical" style={{ marginRight: 6 }}>CRIT</span>{t('legendCrit')}</span>
          </div>
        </div>

        <div>
          <div className="map-shell">
            <div ref={mapRef} />
          </div>
          <FundBadge fund={fund} />
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div className="muted" style={{ marginBottom: 8 }}>
          {data ? t('partnersFound', { n: data.total }) : '—'}
        </div>
        {data && data.branches.length === 0 && <div className="card muted">{t('noPartners')}</div>}

        <div className="grid-2">
          {data?.branches.map((b, i) => (
            <div
              key={b.partnerName + b.branchName + i}
              className="partner-card"
              style={{ borderColor: selectedBranch === b ? '#2563eb' : undefined, cursor: 'pointer' }}
              onClick={() => setSelectedBranch(b)}
            >
              <div className="row1">
                <span className={'tag ' + (b.npa_status ?? 'low').toLowerCase()}>{b.npa_status ?? 'LOW'}</span>
                <h4>{b.partnerName}</h4>
              </div>
              <div className="meta">{b.branchName}</div>
              <div className="meta">
                {b.city && <>{b.city} · </>}
                {b.state} · {b.distance_km != null && <>📍 {b.distance_km} km</>}
              </div>
              <div className="meta">
                {t('healthScore')}: <b>{b.health_score ?? '—'}</b> · {t('gnpa')}: {b.gnpa_ratio != null ? b.gnpa_ratio + '%' : '—'} ·{' '}
                {b.is_eligible
                  ? <span style={{ color: '#15803d', fontWeight: 700 }}>{t('eligible')}</span>
                  : <span style={{ color: '#b91c1c', fontWeight: 700 }}>{t('notEligible')}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}