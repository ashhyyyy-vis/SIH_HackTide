-- Channel Partners table with PostGIS support
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS channel_partners (
    id SERIAL PRIMARY KEY,
    name_i18n JSONB NOT NULL,
    partner_type VARCHAR(50) NOT NULL CHECK (partner_type IN ('SCA', 'PSB', 'RRB', 'NBFC')),
    location GEOGRAPHY(POINT, 4326),
    npa_percentage DECIMAL(5, 2) DEFAULT 0.00 CHECK (npa_percentage >= 0 AND npa_percentage <= 100),
    allocated_funds DECIMAL(15, 2) DEFAULT 0.00,
    utilized_funds DECIMAL(15, 2) DEFAULT 0.00,
    address_i18n JSONB,
    district_i18n JSONB,
    state_i18n JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for spatial queries
CREATE INDEX idx_channel_partners_location ON channel_partners USING GIST(location);

-- Index for partner type
CREATE INDEX idx_channel_partners_type ON channel_partners(partner_type);

-- Index for NPA percentage
CREATE INDEX idx_channel_partners_npa ON channel_partners(npa_percentage);
