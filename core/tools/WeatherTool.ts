import { ToolDefinition } from '../types';

/**
 * WeatherTool — Real-time weather via Open-Meteo (free, no API key required).
 *
 * Supports:
 * - Named city lookup (geocoded via Open-Meteo's free geocoding API)
 * - Direct latitude/longitude
 *
 * @see https://open-meteo.com/
 */

export const WeatherToolDefinition: ToolDefinition = {
    type: 'function',
    function: {
        name: 'get_weather',
        description: 'Get current weather and forecast for a location. If no location is provided, it will use the device location.',
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'City and country, e.g. "London, UK" or "Tokyo".',
                },
                latitude: {
                    type: 'number',
                    description: 'Latitude of the location (optional).',
                },
                longitude: {
                    type: 'number',
                    description: 'Longitude of the location (optional).',
                },
            },
        },
    },
};

export async function executeGetWeather(
    args: { location?: string; latitude?: number; longitude?: number }
): Promise<{ forLLM: string; forUser: string }> {
    try {
        let lat = args.latitude;
        let lon = args.longitude;
        let locationName = args.location;

        // 1. Geocode city name if no coordinates provided
        if (!lat && !lon && locationName) {
            const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`
            );
            const geoData = await geoRes.json();
            if (geoData.results && geoData.results.length > 0) {
                lat = geoData.results[0].latitude;
                lon = geoData.results[0].longitude;
                locationName = geoData.results[0].name;
            } else {
                return {
                    forLLM: `Error: Could not find coordinates for "${locationName}"`,
                    forUser: `I couldn't find the weather for ${locationName}.`,
                };
            }
        }

        if (!lat || !lon) {
            return {
                forLLM: 'Error: No location provided. Please specify a city name.',
                forUser: "Please tell me which city you'd like the weather for!",
            };
        }

        // 2. Fetch weather data
        const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max` +
            `&timezone=auto`
        );
        const data = await weatherRes.json();

        if (!data.current) {
            throw new Error('Failed to fetch weather data');
        }

        const current = data.current;
        const daily = data.daily;

        const report = `
Detailed Weather in ${locationName || 'your area'}:
- Current: ${current.temperature_2m}°C, ${getWeatherDesc(current.weather_code)}
- Feels like: ${current.apparent_temperature}°C
- Humidity: ${current.relative_humidity_2m}%
- Precipitation: ${current.precipitation}mm
- Wind: ${current.wind_speed_10m} km/h
- Today's Range: ${daily.temperature_2m_min[0]}°C – ${daily.temperature_2m_max[0]}°C
- UV Index (Peak): ${daily.uv_index_max[0]}
- Sunrise: ${daily.sunrise[0].split('T')[1]}
- Sunset: ${daily.sunset[0].split('T')[1]}
        `.trim();

        return {
            forLLM: report,
            forUser: `It's currently ${current.temperature_2m}°C in ${locationName || 'your location'} with ${getWeatherDesc(current.weather_code).toLowerCase()}. Today will see a high of ${daily.temperature_2m_max[0]}°C.`,
        };
    } catch (error) {
        return {
            forLLM: `Error fetching weather: ${error instanceof Error ? error.message : String(error)}`,
            forUser: 'I had trouble checking the weather right now.',
        };
    }
}

/** Maps WMO weather code to a human-readable description */
function getWeatherDesc(code: number): string {
    const codes: Record<number, string> = {
        0: 'Clear sky',
        1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        66: 'Light freezing rain', 67: 'Heavy freezing rain',
        71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
        85: 'Slight snow showers', 86: 'Heavy snow showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
    };
    return codes[code] || 'Unknown conditions';
}
