-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('BENEFICIARY', 'CHANNEL_PARTNER', 'ADMIN')),
    family_income DECIMAL(12, 2),
    category VARCHAR(50) CHECK (category IN ('SC', 'ST', 'General')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster phone number lookups
CREATE INDEX idx_users_phone_number ON users(phone_number);
