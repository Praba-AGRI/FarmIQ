import { fieldService } from './fieldService';
import { advisoryService } from './advisoryService';
import { sensorService } from './sensorService';
import { weatherService } from './weatherService';
import { recommendationService } from './recommendationService';

export const reportService = {
  /**
   * Fetch all data needed for full farmer report
   */
  async fetchFullReportData() {
    try {
      // Fetch all fields
      // const fieldsResponse = await fieldService.getAllFields();
      // const fields = fieldsResponse.data;
      
      // Mock data for demonstration
      const fields = [
        {
          id: 1,
          name: 'Field 1',
          cropName: 'Rice',
          cropStage: 'Vegetative',
          location: 'Tamil Nadu, India',
          soilMoisture: 45,
        },
        {
          id: 2,
          name: 'Field 2',
          cropName: 'Cotton',
          cropStage: 'Flowering',
          location: 'Tamil Nadu, India',
          soilMoisture: 65,
        },
      ];

      // Fetch advisories for all fields
      // const advisoriesResponse = await advisoryService.getAdvisoryHistory();
      // const advisories = advisoriesResponse.data;
      
      const advisories = [
        {
          advisory_id: '1',
          field_id: '1',
          field_name: 'Field 1',
          date: '2024-01-15T10:00:00',
          recommendations: [
            { type: 'irrigation', status: 'do_now', message: 'Irrigate with 2 inches of water' },
            { type: 'nutrients', status: 'wait', message: 'Apply nitrogen fertilizer after 2 days' },
          ],
        },
        {
          advisory_id: '2',
          field_id: '1',
          field_name: 'Field 1',
          date: '2024-01-10T10:00:00',
          recommendations: [
            { type: 'irrigation', status: 'monitor', message: 'Monitor soil moisture levels' },
          ],
        },
        {
          advisory_id: '3',
          field_id: '2',
          field_name: 'Field 2',
          date: '2024-01-12T10:00:00',
          recommendations: [
            { type: 'pest', status: 'do_now', message: 'Apply pest control measures' },
          ],
        },
      ];

      // Fetch sensor data for each field
      const fieldsWithSensorData = await Promise.all(
        fields.map(async (field) => {
          try {
            // const sensorResponse = await sensorService.getHistoricalData(field.id, '30d');
            // const sensorData = sensorResponse.data;
            
            // Mock sensor data - ensure proper structure
            const sensorData = Array.from({ length: 30 }, (_, i) => {
              const date = new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000);
              return {
                timestamp: date.toISOString(),
                air_temp: 25 + Math.random() * 10,
                air_humidity: 50 + Math.random() * 30,
                soil_moisture: 40 + Math.random() * 30,
                soil_temp: 20 + Math.random() * 15,
                light_lux: 200 + Math.random() * 800,
                wind_speed: 5 + Math.random() * 20,
              };
            });
            
            return { ...field, sensorData };
          } catch (err) {
            console.error(`Failed to fetch sensor data for field ${field.id}:`, err);
            return { ...field, sensorData: [] };
          }
        })
      );

      // Fetch weather data
      // const weatherResponse = await weatherService.getCurrentWeather('Tamil Nadu, India');
      // const weatherData = weatherResponse.data;
      
      const weatherData = {
        temperature: 28,
        humidity: 65,
        windSpeed: 12,
        conditions: 'Partly Cloudy',
      };

      return {
        fields: fieldsWithSensorData,
        advisories,
        weatherData,
      };
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      throw err;
    }
  },

  /**
   * Fetch data for graphs report
   */
  async fetchGraphsData(fieldId, timeRange = '30d') {
    try {
      // const response = await sensorService.getHistoricalData(fieldId, timeRange);
      // return response.data;
      
      // Mock data
      const dataPoints = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
      return Array.from({ length: dataPoints }, (_, i) => ({
        time: timeRange === '24h' ? `${i}:00` : `Day ${i + 1}`,
        temperature: 25 + Math.random() * 10,
        humidity: 50 + Math.random() * 30,
        soilMoisture: 40 + Math.random() * 30,
        soilTemperature: 20 + Math.random() * 15,
        lightIntensity: 200 + Math.random() * 800,
        windSpeed: 5 + Math.random() * 20,
      }));
    } catch (err) {
      console.error('Failed to fetch graphs data:', err);
      throw err;
    }
  },

  /**
   * Fetch data for recommendations report
   */
  async fetchRecommendationsData(fieldId) {
    try {
      // const response = await recommendationService.getRecommendations(fieldId);
      // return response.data;
      
      // Mock data
      return {
        crop_stage: 'Vegetative',
        gdd_value: 1250.0,
        recommendations: [
          {
            title: 'Irrigation',
            description: 'Irrigate the field with 2 inches of water.',
            status: 'do_now',
            explanation: 'Soil moisture is below optimal levels.',
            timing: 'Within next 6 hours',
          },
          {
            title: 'Nutrients',
            description: 'Apply nitrogen fertilizer at recommended dosage.',
            status: 'wait',
            explanation: 'Wait for 2 days after irrigation.',
            timing: 'After 2 days',
          },
        ],
        ai_reasoning_text: 'Based on current sensor readings...',
      };
    } catch (err) {
      console.error('Failed to fetch recommendations data:', err);
      throw err;
    }
  },

  /**
   * Fetch data for advisories report
   */
  async fetchAdvisoriesData(fieldId = null) {
    try {
      // const response = await advisoryService.getAdvisoryHistory({ fieldId });
      // return response.data;
      
      // Mock data
      return [
        {
          advisory_id: '1',
          field_id: '1',
          field_name: 'Field 1',
          date: '2024-01-15T10:00:00',
          recommendations: [
            { type: 'irrigation', status: 'do_now', message: 'Irrigate with 2 inches of water' },
            { type: 'nutrients', status: 'wait', message: 'Apply nitrogen fertilizer after 2 days' },
          ],
        },
        {
          advisory_id: '2',
          field_id: '1',
          field_name: 'Field 1',
          date: '2024-01-10T10:00:00',
          recommendations: [
            { type: 'irrigation', status: 'monitor', message: 'Monitor soil moisture levels' },
          ],
        },
      ];
    } catch (err) {
      console.error('Failed to fetch advisories data:', err);
      throw err;
    }
  },

  /**
   * Fetch data for weather report
   */
  async fetchWeatherData(location) {
    try {
      // const [currentResponse, forecastResponse, alertsResponse] = await Promise.all([
      //   weatherService.getCurrentWeather(location),
      //   weatherService.getForecast(location),
      //   weatherService.getAlerts(location),
      // ]);
      // return {
      //   current: currentResponse.data,
      //   forecast: forecastResponse.data,
      //   alerts: alertsResponse.data,
      // };
      
      // Mock data
      return {
        current: {
          temperature: 28,
          humidity: 65,
          windSpeed: 12,
          conditions: 'Partly Cloudy',
        },
        forecast: [
          { time: '12:00 PM', temperature: 30, conditions: 'Sunny' },
          { time: '3:00 PM', temperature: 32, conditions: 'Partly Cloudy' },
          { time: '6:00 PM', temperature: 28, conditions: 'Cloudy' },
        ],
        alerts: [
          {
            type: 'rainfall',
            title: 'Rainfall Alert',
            message: 'Light rain expected in next 24 hours.',
          },
        ],
      };
    } catch (err) {
      console.error('Failed to fetch weather data:', err);
      throw err;
    }
  },

  /**
   * Aggregate data by date for full report
   */
  aggregateDataByDate(fields, advisories) {
    try {
      const dateMap = new Map();

      // Add sensor data by date
      if (fields && Array.isArray(fields)) {
        fields.forEach((field) => {
          if (field && field.sensorData && Array.isArray(field.sensorData) && field.sensorData.length > 0) {
            field.sensorData.forEach((reading) => {
              if (reading && reading.timestamp) {
                try {
                  const date = new Date(reading.timestamp).toISOString().split('T')[0];
                  if (!dateMap.has(date)) {
                    dateMap.set(date, {
                      date,
                      fields: {},
                      advisories: [],
                    });
                  }
                  const dayData = dateMap.get(date);
                  const fieldKey = String(field.id || field.field_id || 'unknown');
                  if (!dayData.fields[fieldKey]) {
                    dayData.fields[fieldKey] = {
                      fieldName: field.name || 'Unknown Field',
                      sensorReadings: [],
                    };
                  }
                  dayData.fields[fieldKey].sensorReadings.push(reading);
                } catch (err) {
                  console.error('Error processing sensor reading:', err);
                }
              }
            });
          }
        });
      }

      // Add advisories by date
      if (advisories && Array.isArray(advisories)) {
        advisories.forEach((advisory) => {
          if (advisory && advisory.date) {
            try {
              const date = new Date(advisory.date).toISOString().split('T')[0];
              if (!dateMap.has(date)) {
                dateMap.set(date, {
                  date,
                  fields: {},
                  advisories: [],
                });
              }
              dateMap.get(date).advisories.push(advisory);
            } catch (err) {
              console.error('Error processing advisory:', err);
            }
          }
        });
      }

      // Convert to sorted array
      return Array.from(dateMap.values()).sort((a, b) => {
        try {
          return new Date(a.date) - new Date(b.date);
        } catch (err) {
          return 0;
        }
      });
    } catch (err) {
      console.error('Error in aggregateDataByDate:', err);
      return [];
    }
  },
};

