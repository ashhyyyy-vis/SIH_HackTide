-- Schemes table with i18n support
CREATE TABLE IF NOT EXISTS schemes (
    id SERIAL PRIMARY KEY,
    title_i18n JSONB NOT NULL,
    description_i18n JSONB,
    max_amount DECIMAL(15, 2) NOT NULL,
    interest_rate_min DECIMAL(5, 2) NOT NULL,
    interest_rate_max DECIMAL(5, 2) NOT NULL,
    target_category VARCHAR(50) CHECK (target_category IN ('SC', 'ST', 'General', 'ALL')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example title_i18n structure:
-- {
--   "en": "Scheme Title in English",
--   "hi": "योजना का शीर्षक हिंदी में",
--   "ta": "திட்டத்தின் தலைப்பு தமிழில்"
-- }

-- Index for target category
CREATE INDEX idx_schemes_category ON schemes(target_category);
