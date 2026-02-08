# Guide to Replace Mock Data in Recommendations Section

This guide provides step-by-step instructions for replacing mock data implementations in the recommendations section with real API calls to the backend.

## Table of Contents

1. [Overview](#overview)
2. [Backend API Endpoint](#backend-api-endpoint)
3. [Data Structure Mapping](#data-structure-mapping)
4. [RecommendationsTab Component](#recommendationstab-component)
5. [Dashboard Page Recommendations](#dashboard-page-recommendations)
6. [Report Service Recommendations](#report-service-recommendations)
7. [Testing Checklist](#testing-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The recommendations section currently uses mock data for demonstration purposes. This guide helps you replace all mock implementations with real API calls to your backend.

### Prerequisites

- Backend API is running and accessible
- API endpoint `/api/fields/{field_id}/recommendations` is implemented
- Authentication tokens are properly configured
- API base URL is set in environment variables

### Key Components

- **RecommendationsTab**: Main component displaying recommendations for a field
- **DashboardPage**: Shows top recommendations in field cards
- **ReportService**: Fetches recommendations data for report generation

---

## Backend API Endpoint

### Endpoint Details

**URL:** `POST /api/fields/{field_id}/recommendations`

**Method:** POST

**Authentication:** Required (JWT token in Authorization header)

**Request Body:** None (field_id is in URL path)

**Response Format:**
```json
{
  "crop_stage": "Vegetative",
  "gdd_value": 1250.0,
  "recommendations": [
    {
      "title": "Irrigation",
      "description": "Irrigate the field with 2 inches of water. Current soil moisture is 45%, which is below optimal levels.",
      "status": "do_now",
      "explanation": "Soil moisture is at 45%, which is below the optimal range of 60-70% for the current crop stage.",
      "timing": "Within next 6 hours"
    },
    {
      "title": "Nutrients",
      "description": "Apply nitrogen fertilizer at recommended dosage.",
      "status": "wait",
      "explanation": "Crop is in vegetative stage. Wait for 2 days after irrigation before applying fertilizer.",
      "timing": "After 2 days"
    },
    {
      "title": "Pest/Disease Risk",
      "description": "Monitor for pest activity. High humidity conditions favor pest development.",
      "status": "monitor",
      "explanation": "Relative humidity is above 60% (65%) and temperature is optimal for pest activity. Regular monitoring recommended.",
      "timing": "Daily monitoring"
    }
  ],
  "ai_reasoning_text": "Based on current sensor readings and crop stage analysis..."
}
```

**Status Codes:**
- `200 OK`: Successfully retrieved recommendations
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Field not found or doesn't belong to user
- `500 Internal Server Error`: Server error

---

## Data Structure Mapping

### Backend Response → Frontend Format

The backend returns recommendations in a nested structure. You need to map it to the frontend format:

**Backend Format:**
```javascript
{
  crop_stage: "Vegetative",
  gdd_value: 1250.0,
  recommendations: [
    {
      title: "Irrigation",
      description: "...",
      status: "do_now",  // "do_now", "wait", or "monitor"
      explanation: "...",
      timing: "..."
    }
  ],
  ai_reasoning_text: "..."
}
```

**Frontend Format (RecommendationCard expects):**
```javascript
{
  id: 1,  // Generated on frontend (index + 1)
  title: "Irrigation",
  description: "...",
  status: "do_now",  // Must match RECOMMENDATION_STATUS enum
  explanation: "...",
  timing: "..."
}
```

**Status Value Mapping:**
- Backend: `"do_now"` → Frontend: `RECOMMENDATION_STATUS.DO_NOW`
- Backend: `"wait"` → Frontend: `RECOMMENDATION_STATUS.WAIT`
- Backend: `"monitor"` → Frontend: `RECOMMENDATION_STATUS.MONITOR`

---

## RecommendationsTab Component

### File: `src/components/tabs/RecommendationsTab.jsx`

#### Current Implementation (Mock Data)

**Location:** Lines 19-57

**Current Code:**
```javascript
const fetchRecommendations = async () => {
  try {
    setLoading(true);
    setError('');
    // Mock data for demonstration
    setRecommendations([
      {
        id: 1,
        title: t('irrigation'),
        description: 'Irrigate the field with 2 inches of water. Current soil moisture is below optimal levels.',
        status: RECOMMENDATION_STATUS.DO_NOW,
        explanation: 'Soil moisture is at 45%, which is below the optimal range of 60-70% for the current crop stage.',
        timing: 'Within next 6 hours',
      },
      {
        id: 2,
        title: t('nutrients'),
        description: 'Apply nitrogen fertilizer at recommended dosage.',
        status: RECOMMENDATION_STATUS.WAIT,
        explanation: 'Crop is in vegetative stage. Wait for 2 days after irrigation before applying fertilizer.',
        timing: 'After 2 days',
      },
      {
        id: 3,
        title: t('pestRisk'),
        description: 'Monitor for pest activity. High humidity conditions favor pest development.',
        status: RECOMMENDATION_STATUS.MONITOR,
        explanation: 'Relative humidity is above 60% and temperature is optimal for pest activity. Regular monitoring recommended.',
        timing: 'Daily monitoring',
      },
    ]);
    // const response = await recommendationService.getRecommendations(fieldId);
    // setRecommendations(response.data);
  } catch (err) {
    setError('Failed to load recommendations');
  } finally {
    setLoading(false);
  }
};
```

#### Replacement Implementation

**Replace With:**
```javascript
const fetchRecommendations = async () => {
  try {
    setLoading(true);
    setError('');
    
    const response = await recommendationService.getRecommendations(fieldId);
    const backendData = response.data;
    
    // Map backend response to frontend format
    const mappedRecommendations = backendData.recommendations.map((rec, index) => ({
      id: index + 1,
      title: rec.title,
      description: rec.description,
      status: rec.status, // Should match RECOMMENDATION_STATUS enum values
      explanation: rec.explanation || null,
      timing: rec.timing || null,
    }));
    
    setRecommendations(mappedRecommendations);
  } catch (err) {
    console.error('Error fetching recommendations:', err);
    setError(err.response?.data?.detail || 'Failed to load recommendations. Please try again later.');
    setRecommendations([]);
  } finally {
    setLoading(false);
  }
};
```

**Key Changes:**
1. Remove all mock data (lines 24-49)
2. Uncomment and use `recommendationService.getRecommendations(fieldId)`
3. Map backend response structure to frontend format
4. Generate `id` field from array index
5. Handle optional fields (`explanation`, `timing`) with null fallback
6. Improve error handling with detailed error messages

---

## Dashboard Page Recommendations

### File: `src/pages/DashboardPage.jsx`

#### Current Implementation (Mock Data)

**Location:** Lines 40-76

**Current Code:**
```javascript
const fetchRecommendations = async (fieldId) => {
  try {
    // const response = await recommendationService.getRecommendations(fieldId);
    // return response.data.recommendations || [];
    
    // Mock recommendations data
    if (fieldId === 1) {
      return [
        {
          id: 1,
          title: 'Irrigation',
          description: 'Irrigate the field...',
          status: RECOMMENDATION_STATUS.DO_NOW,
          // ...
        },
        // ... more mock data
      ];
    }
    // ... more mock data for other fields
  } catch (err) {
    console.error('Failed to fetch recommendations:', err);
    return [];
  }
};
```

#### Replacement Implementation

**Replace With:**
```javascript
const fetchRecommendations = async (fieldId) => {
  try {
    const response = await recommendationService.getRecommendations(fieldId);
    const backendData = response.data;
    
    // Map backend response to frontend format
    return backendData.recommendations.map((rec, index) => ({
      id: index + 1,
      title: rec.title,
      description: rec.description,
      status: rec.status,
      explanation: rec.explanation || null,
      timing: rec.timing || null,
    }));
  } catch (err) {
    console.error('Failed to fetch recommendations:', err);
    return [];
  }
};
```

**Key Changes:**
1. Remove all mock data conditionals
2. Use real API call
3. Map backend response to frontend format
4. Return empty array on error (graceful degradation)

---

## Report Service Recommendations

### File: `src/services/reportService.js`

#### Current Implementation (Mock Data)

**Location:** Lines 149-179

**Current Code:**
```javascript
async fetchRecommendationsData(fieldId) {
  try {
    // const response = await recommendationService.getRecommendations(fieldId);
    // return response.data;
    
    // Mock data for report generation
    return {
      crop_stage: "Vegetative",
      gdd_value: 1250.0,
      recommendations: [
        {
          title: "Irrigation",
          description: "...",
          status: "do_now",
          // ...
        },
        // ... more mock data
      ],
      ai_reasoning_text: "..."
    };
  } catch (err) {
    console.error('Failed to fetch recommendations data:', err);
    return null;
  }
}
```

#### Replacement Implementation

**Replace With:**
```javascript
async fetchRecommendationsData(fieldId) {
  try {
    const response = await recommendationService.getRecommendations(fieldId);
    return response.data; // Backend response already matches expected format
  } catch (err) {
    console.error('Failed to fetch recommendations data:', err);
    return null;
  }
}
```

**Key Changes:**
1. Remove all mock data
2. Use real API call
3. Return backend response directly (format already matches)

---

## Testing Checklist

After implementing the changes, test the following:

### RecommendationsTab Component

- [ ] Recommendations load successfully when field is selected
- [ ] Loading spinner displays while fetching data
- [ ] Error message displays if API call fails
- [ ] Empty state displays when no recommendations are available
- [ ] All recommendation cards render correctly with proper status colors
- [ ] Status badges display correct text (Do Now, Wait, Monitor)
- [ ] Explanation and timing fields display when available
- [ ] Cards are clickable and display full information

### Dashboard Page

- [ ] Top 2-3 recommendations display in field cards
- [ ] Recommendations are sorted by priority (DO_NOW first)
- [ ] "Has more recommendations" indicator shows when applicable
- [ ] Recommendations update when field data changes
- [ ] No errors when recommendations fail to load (graceful degradation)

### Report Generation

- [ ] Recommendations report generates successfully
- [ ] All recommendation data appears in PDF
- [ ] Crop stage and GDD value display correctly
- [ ] AI reasoning text appears in report
- [ ] Report handles missing data gracefully

### Error Handling

- [ ] Network errors are handled gracefully
- [ ] 401 errors redirect to login
- [ ] 404 errors show appropriate message
- [ ] 500 errors show user-friendly message
- [ ] Empty recommendations array doesn't break UI

---

## Troubleshooting

### Common Issues

#### 1. Recommendations Not Loading

**Problem:** Recommendations don't appear after API call.

**Solutions:**
- Check browser console for errors
- Verify API endpoint is accessible
- Check authentication token is valid
- Verify field_id is correct
- Check network tab for API response

#### 2. Status Values Not Matching

**Problem:** Status badges don't display correctly.

**Solutions:**
- Verify backend returns status as: `"do_now"`, `"wait"`, or `"monitor"` (lowercase with underscore)
- Check `RECOMMENDATION_STATUS` constants match backend values
- Ensure status mapping is correct in transformation code

#### 3. Missing Fields in Recommendations

**Problem:** Some recommendation fields are missing (explanation, timing).

**Solutions:**
- Backend fields are optional - handle with null checks
- Use optional chaining: `rec.explanation || null`
- Update UI to handle null values gracefully

#### 4. CORS Errors

**Problem:** CORS errors when calling API.

**Solutions:**
- Verify backend CORS configuration includes frontend origin
- Check API base URL is correct
- Ensure credentials are included in requests

#### 5. Authentication Errors

**Problem:** 401 Unauthorized errors.

**Solutions:**
- Verify token is stored correctly in localStorage
- Check token hasn't expired
- Ensure token is sent in Authorization header
- Verify user is logged in

---

## API Service Implementation

### File: `src/services/recommendationService.js`

**Current Implementation:**
```javascript
export const recommendationService = {
  getRecommendations: async (fieldId) => {
    // Placeholder API call
    return api.get(`/fields/${fieldId}/recommendations`);
  },
  // ...
};
```

**Note:** The service is already correctly implemented. No changes needed unless you want to add error handling or request/response interceptors.

---

## Data Flow

```
User Action
    ↓
RecommendationsTab Component
    ↓
recommendationService.getRecommendations(fieldId)
    ↓
API Call: POST /api/fields/{field_id}/recommendations
    ↓
Backend: AI Agent + Reasoning Layer
    ↓
Response: AIRecommendationResponse
    ↓
Frontend: Map to RecommendationCard format
    ↓
Display: RecommendationCard Components
```

---

## Additional Notes

### Status Priority Order

Recommendations should be sorted by priority:
1. `DO_NOW` (highest priority - red badge)
2. `WAIT` (medium priority - yellow badge)
3. `MONITOR` (lowest priority - blue badge)

### Optional Fields

- `explanation`: May be null/undefined
- `timing`: May be null/undefined
- Always use optional chaining or null checks

### Error States

- Show loading spinner during fetch
- Show error message if fetch fails
- Show empty state if no recommendations
- Don't break UI if recommendations fail to load

---

## Related Files

- `src/components/tabs/RecommendationsTab.jsx` - Main recommendations display
- `src/components/field/RecommendationCard.jsx` - Individual recommendation card
- `src/pages/DashboardPage.jsx` - Dashboard with field recommendations
- `src/services/recommendationService.js` - API service
- `src/services/reportService.js` - Report generation service
- `src/utils/constants.js` - RECOMMENDATION_STATUS constants
- `backend/routes/ai.py` - Backend recommendations endpoint
- `backend/models/schemas.py` - Data schemas

---

**Last Updated:** January 2024
**Version:** 1.0
