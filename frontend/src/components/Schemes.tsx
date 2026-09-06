import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguageStore } from '../store/languageStore';

interface Scheme {
  id: number;
  title: string;
  max_amount: number;
  interest_rate_min: number;
  interest_rate_max: number;
  target_category: string;
  title_i18n: any;
  description?: string;
}

const Schemes: React.FC = () => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [filteredSchemes, setFilteredSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const { language } = useLanguageStore();

  useEffect(() => {
    fetchSchemes();
  }, [categoryFilter, language]);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const params: any = { lang: language };
      if (categoryFilter !== 'ALL') {
        params.category = categoryFilter;
      }

      const response = await axios.get('/api/schemes', { params });
      setSchemes(response.data.schemes);
      setFilteredSchemes(response.data.schemes);
    } catch (error) {
      console.error('Error fetching schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <div className="wrap" style={{ padding: 'var(--s8) 0' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--n-900)', marginBottom: 'var(--s6)' }}>Government Schemes</h1>

        {/* Filters */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--n-200)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', padding: 'var(--s4)', marginBottom: 'var(--s6)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s3)', alignItems: 'center' }}>
            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--n-700)' }}>Category:</label>
              <div className="select" style={{ position: 'relative' }}>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    width: '100%',
                    height: 'var(--tap)',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    border: '1px solid var(--n-300)',
                    borderRadius: 'var(--r-md)',
                    background: 'var(--n-0)',
                    color: 'var(--n-900)',
                    padding: '0 44px 0 var(--s3)',
                    fontSize: '16px',
                    cursor: 'pointer',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\'%3E%3Cpath d=\'M5 8l5 5 5-5\'/%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center'
                  }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Schemes List */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--primary-600)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
          </div>
        ) : filteredSchemes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--n-500)' }}>
            <p>No schemes found for the selected criteria.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--s3)', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filteredSchemes.map((scheme) => (
              <div key={scheme.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--n-200)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', padding: 'var(--s4)', transition: 'box-shadow 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--n-900)', marginBottom: 'var(--s3)' }}>
                  {scheme.title}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', fontSize: '14px', color: 'var(--n-700)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>Max Amount:</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                      {formatCurrency(scheme.max_amount)}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>Interest Rate:</span>
                    <span>
                      {scheme.interest_rate_min}% - {scheme.interest_rate_max}%
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>Category:</span>
                    <span style={{ padding: '4px 8px', background: 'var(--primary-50)', color: 'var(--primary-600)', borderRadius: 'var(--r-sm)', fontSize: '12px', fontWeight: 500 }}>
                      {scheme.target_category}
                    </span>
                  </div>
                </div>

                <button className="btn btn-primary" style={{
                  marginTop: 'var(--s4)',
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
                  color: 'var(--n-0)',
                  width: '100%'
                }}>
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Schemes;
