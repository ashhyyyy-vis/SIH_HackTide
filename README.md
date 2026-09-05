# SIH Hackathon - Financial Inclusion Portal

A MERN stack application with PostGIS for geo-spatial partner location and i18next for multi-language support, built for the Smart India Hackathon.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, PostgreSQL with PostGIS
- **Frontend**: React, TypeScript, Vite, TailwindCSS, Leaflet, React-Leaflet
- **State Management**: Zustand
- **Database**: PostgreSQL with PostGIS extension
- **Authentication**: Mock Phone OTP with JWT

## Project Structure

```
SIH_IMP/
├── backend/                 # Express TypeScript backend
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API routes
│   │   └── index.ts        # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/          # Zustand state management
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
├── database/               # SQL schema scripts
│   └── schema/
│       ├── users.sql
│       ├── channel_partners.sql
│       └── schemes.sql
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL with PostGIS extension
- npm or yarn

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE sih_hackathon;

# Connect to the database
\c sih_hackathon

# Enable PostGIS extension
CREATE EXTENSION postgis;
```

### 2. Run Schema Scripts

Execute the SQL schema files in order:

```bash
# From the project root
psql -U postgres -d sih_hackathon -f database/schema/users.sql
psql -U postgres -d sih_hackathon -f database/schema/channel_partners.sql
psql -U postgres -d sih_hackathon -f database/schema/schemes.sql
```

### 3. Insert Sample Data (Optional)

```sql
-- Insert sample channel partners
INSERT INTO channel_partners (name, partner_type, location, npa_percentage, allocated_funds, utilized_funds, address, district, state)
VALUES 
  ('State Bank of India', 'PSB', ST_MakePoint(77.2090, 28.6139)::geography, 5.5, 1000000, 500000, 'Connaught Place', 'New Delhi', 'Delhi'),
  ('Punjab National Bank', 'PSB', ST_MakePoint(77.1025, 28.6538)::geography, 8.2, 800000, 400000, 'Karol Bagh', 'New Delhi', 'Delhi'),
  ('HDFC Bank', 'NBFC', ST_MakePoint(77.0689, 28.5273)::geography, 3.1, 1200000, 600000, 'Saket', 'New Delhi', 'Delhi');

-- Insert sample schemes
INSERT INTO schemes (title_i18n, max_amount, interest_rate_min, interest_rate_max, target_category)
VALUES 
  ('{"en": "Pradhan Mantri Mudra Yojana", "hi": "प्रधानमंत्री मुद्रा योजना"}', 1000000, 8.5, 12.0, 'ALL'),
  ('{"en": "Stand Up India Scheme", "hi": "स्टैंड अप इंडिया योजना"}', 5000000, 7.5, 10.0, 'SC'),
  ('{"en": "National Livelihood Mission", "hi": "राष्ट्रीय आजीविका मिशन"}', 2000000, 9.0, 11.5, 'ST');
```

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Update `.env` with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sih_hackathon
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret_key_change_in_production

PORT=5000
NODE_ENV=development
```

### 3. Start Backend Server

```bash
# Development mode with hot reload
npm run dev

# Or build and start
npm run build
npm start
```

The backend will run on `http://localhost:5000`

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### 3. Build for Production

```bash
npm run build
npm run preview
```

## API Endpoints

### Authentication

- `POST /api/auth/send-otp` - Send OTP to phone number
- `POST /api/auth/verify-otp` - Verify OTP and get JWT token
- `GET /api/auth/me` - Get current user info (requires auth)

### Partners

- `GET /api/partners/nearby?lat=&lng=&radius_km=25&max_npa=10.0` - Get nearby partners
- `GET /api/partners/:id` - Get partner details

### Schemes

- `GET /api/schemes?category=&lang=en` - Get all schemes
- `GET /api/schemes/:id?lang=en` - Get scheme details

## Features

### 1. Mock Phone Authentication
- OTP-based phone verification (development mode logs OTP to console)
- JWT token generation and validation
- Automatic user registration on first login

### 2. Geo-Spatial Partner Locator
- PostGIS-powered spatial queries
- Find partners within specified radius
- Filter by NPA percentage
- Visual indicators for eligible/ineligible partners
- OSRM routing integration for navigation

### 3. Government Schemes
- Multi-language support (English, Hindi, Tamil)
- Category-based filtering (SC, ST, General)
- Interest rate and amount information

## Development Notes

### TypeScript Errors
TypeScript errors in the IDE are expected until dependencies are installed. Run `npm install` in both backend and frontend directories to resolve these.

### OTP in Development
In development mode, OTPs are logged to the console and returned in the API response for easy testing.

### PostGIS Queries
The backend uses PostGIS spatial functions for efficient geo-spatial queries. Ensure PostGIS extension is enabled in your database.

## Testing the Application

1. Start the backend server (`cd backend && npm run dev`)
2. Start the frontend server (`cd frontend && npm run dev`)
3. Open `http://localhost:3000` in your browser
4. Enter a phone number (10 digits)
5. Check the backend console for the OTP
6. Verify OTP to login
7. Navigate to Partner Map or Schemes

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify database credentials in `.env`
- Check if PostGIS extension is enabled

### Port Conflicts
- Change `PORT` in backend `.env` if 5000 is in use
- Change port in `vite.config.ts` if 3000 is in use

### Leaflet Map Issues
- Ensure geolocation is enabled in your browser
- Check browser console for API errors

## License

MIT
