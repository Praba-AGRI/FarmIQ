# AI Agricultural Decision Support System

A complete React-based frontend dashboard and Python FastAPI backend for an AI-powered agricultural decision support system. This dashboard visualizes real-time field sensor data, displays AI-generated recommendations, provides an explainable AI reasoning assistant, and shows weather-based alerts for farmers.

## 🚀 Quick Local Preview

### Start Backend (Terminal 1):
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### Start Frontend (Terminal 2):
```bash
npm install
npm run dev
```

### Open Browser:
Visit **http://localhost:5173**

See [LOCAL_PREVIEW.md](LOCAL_PREVIEW.md) for detailed instructions.

## Features

- **Landing Page**: Hero section explaining AI-powered climate-resilient farming
- **Authentication**: Login and Signup with form validation
- **Dashboard**: Overview of all farmer fields with status indicators
- **Field Detail Page**: Comprehensive view with 6 tabs:
  - Real-Time Sensor Data (gauges and meters)
  - Graphs & Trends (line charts with time range selection)
  - AI Recommendations (with status badges)
  - AI Reasoning Assistant (chat interface)
  - Weather & Alerts
  - ML & Logic Transparency
- **Advisory History**: Timeline view of past advisories with filtering
- **Profile Page**: User profile management
- **Settings Page**: Notification preferences, alerts, language, and theme settings
- **Multi-language Support**: Full English and Tamil translations

## Tech Stack

- **React 18** with Hooks
- **React Router v6** for navigation
- **Axios** for API calls
- **Recharts** for data visualization
- **Tailwind CSS** for styling
- **Vite** as build tool

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── common/         # Header, Footer, LoadingSpinner, etc.
│   ├── auth/           # LoginForm, SignupForm
│   ├── dashboard/      # FieldCard, FieldList
│   ├── field/          # SensorGauge, LineChart, ChatInterface, etc.
│   └── tabs/           # Tab components for FieldDetailPage
├── pages/              # Page components
├── services/           # API service layer
├── context/            # React Context providers (Auth, Language)
├── hooks/              # Custom hooks
└── utils/              # Utilities (translations, constants)
```

## API Configuration

The application uses placeholder API endpoints. Update the `API_BASE_URL` in `src/utils/constants.js` or set the `VITE_API_BASE_URL` environment variable to point to your backend API.

Default API endpoints:
- `/api/auth/login`
- `/api/auth/signup`
- `/api/fields`
- `/api/fields/:id/sensors`
- `/api/fields/:id/recommendations`
- `/api/fields/:id/chat`
- `/api/weather`
- `/api/advisories`

## Features in Detail

### Authentication
- Email or mobile number login
- Signup with name, mobile, location, farming type, and language preference
- Protected routes with automatic redirect to login

### Dashboard
- Grid view of all fields
- Each field card shows:
  - Field name and crop
  - Current crop stage
  - Soil moisture status with visual indicator
  - Alert badges

### Field Detail Page
- **Sensor Data Tab**: Real-time readings with circular gauges and progress meters
- **Graphs Tab**: Line charts for temperature, humidity, and soil moisture with 24h/7d/30d time ranges
- **Recommendations Tab**: AI-generated recommendations with status (Do Now/Wait/Monitor)
- **AI Chat Tab**: Interactive chat interface to ask questions about recommendations
- **Weather Tab**: Current weather, 24h forecast, and alerts
- **Transparency Tab**: Shows sensor values, crop stage, GDD, and logic summaries used by AI

### Language Support
- Full English and Tamil translations
- Language switcher in header
- All UI text is translatable

## Architecture

- **No ML Logic in Frontend**: All recommendations and calculations come from backend API
- **Component-Based**: Reusable, modular components
- **Context API**: Global state management for auth and language
- **Service Layer**: Centralized API calls with axios interceptors
- **Responsive Design**: Desktop-first, mobile-friendly

## Development Notes

- Mock data is used for demonstration purposes. Replace with actual API calls in production.
- All API service methods are ready but currently return mock data.
- The application is fully functional with mock data for testing and demonstration.

## License

This project is part of an AI-powered agricultural decision support system.



