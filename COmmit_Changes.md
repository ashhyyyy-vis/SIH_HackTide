# Commit 1: Generated the skeleton of the project

## Database Schema Files

### database/schema/users.sql
- Creates users table with phone authentication, role management (BENEFICIARY, CHANNEL_PARTNER, ADMIN), and category support
- Includes indexes for phone number lookups

### database/schema/channel_partners.sql
- Creates channel partners table with PostGIS spatial support for geo-location queries
- Includes partner types (SCA, PSB, RRB, NBFC), NPA tracking, and fund allocation management
- Spatial indexes for efficient nearby partner searches

### database/schema/schemes.sql
- Creates schemes table with i18n JSON support for multi-language titles
- Stores scheme details like max amount, interest rates, and target categories (SC, ST, General)

## Backend Files

### backend/package.json
- Node.js/Express backend dependencies including TypeScript, PostgreSQL (pg), JWT authentication, and validation

### backend/tsconfig.json
- TypeScript configuration for backend compilation with strict mode enabled

### backend/.env.example
- Environment variables template for database connection, JWT secret, and server configuration

### backend/src/index.ts
- Main Express server entry point with CORS, route mounting, and health check endpoint

### backend/src/config/database.ts
- PostgreSQL connection pool configuration using environment variables

### backend/src/middleware/auth.ts
- JWT authentication middleware for protected routes, validates tokens and attaches user info to requests

### backend/src/routes/auth.ts
- Phone OTP authentication endpoints (send-otp, verify-otp) with in-memory OTP storage for development
- Automatic user registration and JWT token generation

### backend/src/routes/partners.ts
- PostGIS spatial API endpoint for finding nearby partners within radius
- Filters by NPA percentage and fund availability, returns eligibility status

### backend/src/routes/schemes.ts
- Government schemes API with category filtering and multi-language support
- Returns scheme details with localized titles based on language parameter

## Frontend Files

### frontend/package.json
- React frontend dependencies including Vite, TypeScript, React Router, Leaflet maps, Zustand state management, and TailwindCSS

### frontend/tsconfig.json
- TypeScript configuration for React/Vite frontend with JSX support

### frontend/tsconfig.node.json
- TypeScript configuration for Vite build tool

### frontend/vite.config.ts
- Vite configuration with React plugin and API proxy to backend server

### frontend/tailwind.config.js
- TailwindCSS configuration for styling

### frontend/postcss.config.js
- PostCSS configuration for TailwindCSS processing

### frontend/index.html
- HTML entry point with Leaflet CSS CDN link

### frontend/src/main.tsx
- React application entry point

### frontend/src/index.css
- Global styles with TailwindCSS directives

### frontend/src/App.tsx
- Main React component with routing setup for Auth, Partner Map, and Schemes pages

### frontend/src/store/authStore.ts
- Zustand state management for authentication (token, user data, logout)

### frontend/src/components/Navbar.tsx
- Navigation bar with user info display and logout functionality

### frontend/src/components/Auth.tsx
- Phone OTP authentication UI with send/verify OTP flow and form validation

### frontend/src/components/PartnerMap.tsx
- Leaflet map interface displaying nearby partners with custom markers
- OSRM routing integration for navigation, radius/NPA filters, and eligibility indicators

### frontend/src/components/Schemes.tsx
- Government schemes listing with category and language filters
- Card-based display with scheme details and currency formatting

## Documentation Files

### README.md
- Complete setup instructions including database configuration, installation steps, API documentation, and troubleshooting guide

### .gitignore
- Updated to exclude node_modules directory

---

# Commit 2: Integrated Bhashini API for multi-language support

## Database Schema Files

### database/schema/schemes.sql
- Added description_i18n JSONB field for storing localized scheme descriptions
- Supports multi-language caching for scheme content

### database/schema/channel_partners.sql
- Updated to use name_i18n, address_i18n, district_i18n, state_i18n JSONB fields
- Replaced single-language text fields with multi-language JSON structure
- Maintains PostGIS spatial support for geo-location queries

## Backend Files

### backend/.env.example
- Added Bhashini API configuration variables (BHASHINI_USER_ID, BHASHINI_ULCA_API_KEY, BHASHINI_INFERENCE_API_KEY)
- Template for Bhashini credentials required for translation services

### backend/src/services/bhashini.ts
- New Bhashini service module for Government of India's AI language engine integration
- Implements pipeline discovery endpoint to locate model URLs
- Neural Machine Translation (NMT) support for Hindi, Marathi, Tamil, Telugu, Bengali, and other Indian languages
- Pipeline caching for improved performance
- Batch translation support for multiple texts

### backend/src/routes/schemes.ts
- Integrated translation caching logic with Bhashini service
- Automatic on-the-fly translation when requested language not cached
- Updates database JSON fields with new translations for future requests
- Returns localized scheme titles and descriptions based on language parameter

### backend/src/routes/partners.ts
- Integrated translation caching for partner data (name, address, district, state)
- Supports language parameter in nearby partners and single partner endpoints
- Automatic translation and caching for non-English languages
- Maintains spatial query performance while adding i18n support

### backend/src/routes/translate.ts
- New general translation endpoint for custom UI strings and user inputs
- POST /api/translate for single text translation
- POST /api/translate/batch for batch translation of multiple texts
- Supports source and target language specification

### backend/src/index.ts
- Registered translate routes under /api/translate path
- Added translation service integration to main Express application

### backend/package.json
- Added axios dependency for Bhashini API HTTP requests
- Added @types/axios for TypeScript support

## Frontend Files

### frontend/src/store/languageStore.ts
- New Zustand state store for global language management
- Tracks currently selected language across all pages
- Provides setLanguage function for language switching

### frontend/src/components/Navbar.tsx
- Added language selector dropdown with 6 Indian languages (English, Hindi, Tamil, Telugu, Marathi, Bengali)
- Integrated with languageStore for global language state
- Language names displayed in native scripts

### frontend/src/components/Schemes.tsx
- Integrated with languageStore to use global language state
- Removed local language selector (now managed by Navbar)
- Automatic data fetching with active language parameter
- Added description field to Scheme interface

### frontend/src/components/PartnerMap.tsx
- Integrated with languageStore for language-aware partner data fetching
- Passes language parameter to nearby partners API endpoint
- Automatic refetch when language changes

### frontend/src/components/AudioAssist.tsx
- New text-to-speech component for accessibility
- Uses Web Speech API for audio playback
- Supports multiple Indian languages with proper language codes
- Play/pause functionality with visual indicators
- Graceful degradation for browsers without speech synthesis support

## Documentation Files

### SETUP_GUIDE.md
- Comprehensive setup guide for Bhashini API integration
- Step-by-step instructions for backend and frontend configuration
- Bhashini API credential acquisition guide
- Database schema update instructions
- API endpoint documentation
- Usage examples for language switching and audio assistance
- Troubleshooting guide for common issues
- Production deployment considerations
