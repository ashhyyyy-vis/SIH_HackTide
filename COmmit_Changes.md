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
