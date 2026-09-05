# SIH IMP - Setup Guide

This guide will help you set up the project with Bhashini API integration for multi-language support.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL with PostGIS extension
- Bhashini API credentials (from https://bhashini.gov.in/)

## Project Structure

```
SIH_IMP/
├── backend/                 # Express.js backend with TypeScript
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/     # Authentication middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Bhashini translation service
│   │   └── index.ts        # Entry point
│   ├── .env.example        # Environment variables template
│   └── package.json        # Backend dependencies
├── frontend/               # React frontend with TypeScript
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/          # Zustand state management
│   │   └── App.tsx         # Main app component
│   └── package.json        # Frontend dependencies
├── database/
│   └── schema/             # SQL schema files
└── README.md              # This file
```

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and add your credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your actual values:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sih_hackathon
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secret
JWT_SECRET=your_jwt_secret_key_change_in_production

# Server Configuration
PORT=5000
NODE_ENV=development

# Bhashini API Configuration
BHASHINI_USER_ID=your_bhashini_user_id
BHASHINI_ULCA_API_KEY=your_ulca_api_key
BHASHINI_INFERENCE_API_KEY=your_inference_api_key
```

### 3. Get Bhashini API Credentials

1. Visit https://bhashini.gov.in/
2. Register for an account
3. Navigate to the API section
4. Generate your credentials:
   - User ID
   - ULCA API Key
   - Inference API Key

### 4. Set Up Database

Create a PostgreSQL database with PostGIS extension:

```sql
CREATE DATABASE sih_hackathon;
\c sih_hackathon
CREATE EXTENSION IF NOT EXISTS postgis;
```

Run the schema files:

```bash
psql -U postgres -d sih_hackathon -f database/schema/users.sql
psql -U postgres -d sih_hackathon -f database/schema/schemes.sql
psql -U postgres -d sih_hackathon -f database/schema/channel_partners.sql
```

### 5. Start Backend Server

```bash
npm run dev
```

The backend will run on `http://localhost:5000`

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure API Proxy

Update `vite.config.ts` if needed to proxy API requests to the backend:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
```

### 3. Start Frontend Development Server

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Features Implemented

### 1. Multi-Language Support

- **Backend**: Bhashini API integration for on-the-fly translation
- **Frontend**: Language selector in navbar with support for:
  - English (en)
  - Hindi (hi)
  - Tamil (ta)
  - Telugu (te)
  - Marathi (mr)
  - Bengali (bn)

### 2. Translation Caching

- Translations are cached in database JSON fields
- First request translates via Bhashini API
- Subsequent requests use cached translations
- Automatic cache updates for new translations

### 3. Database Schema Updates

- **Schemes Table**: Added `description_i18n` JSONB field
- **Channel Partners Table**: Updated to use `name_i18n`, `address_i18n`, `district_i18n`, `state_i18n` JSONB fields

### 4. API Endpoints

- `GET /api/schemes?lang={language}` - Fetch schemes with translations
- `GET /api/schemes/:id?lang={language}` - Fetch single scheme with translations
- `GET /api/partners/nearby?lat={lat}&lng={lng}&lang={language}` - Fetch nearby partners with translations
- `GET /api/partners/:id?lang={language}` - Fetch single partner with translations
- `POST /api/translate` - Translate custom text
- `POST /api/translate/batch` - Translate multiple texts

### 5. Frontend Components

- **Language Store**: Zustand store for global language state
- **Navbar**: Language selector dropdown
- **Schemes**: Integrated with language state for automatic translation
- **PartnerMap**: Integrated with language state for partner data translation
- **AudioAssist**: Text-to-speech component for accessibility

## Usage

### Changing Language

1. Use the language selector in the navbar
2. All data will automatically fetch in the selected language
3. Translations are cached for better performance

### Using Audio Assistance

The AudioAssist component can be added to any component to provide text-to-speech functionality:

```tsx
import AudioAssist from './components/AudioAssist';

<AudioAssist text="Your text here" language="hi" />
```

### Custom Translation API

Use the translation endpoint for custom text:

```bash
curl -X POST http://localhost:5000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello World", "targetLanguage": "hi"}'
```

## Troubleshooting

### Bhashini API Issues

- Ensure your API credentials are correct
- Check if you have sufficient API quota
- Verify network connectivity to Bhashini servers

### Database Issues

- Ensure PostGIS extension is installed
- Check database connection parameters in `.env`
- Verify JSONB fields are properly configured

### Translation Not Working

- Check browser console for errors
- Verify backend is running and accessible
- Ensure language parameter is being passed correctly

## Development Notes

- TypeScript is used throughout the project
- All API calls include language parameters
- Translations are cached to reduce API calls
- The system falls back to English if translation fails
- Audio assistance uses Web Speech API (browser-dependent)

## Production Deployment

1. Set `NODE_ENV=production` in environment variables
2. Use a production-grade PostgreSQL instance
3. Implement proper error handling and logging
4. Use HTTPS for all API communications
5. Implement rate limiting for Bhashini API calls
6. Set up monitoring for API usage and costs

## License

MIT
