/**
 * Live weather via Open-Meteo (free, no API key, CORS-enabled — callable from browser or server).
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
  label: string;
}

/** Fallback when the browser won't share location: the HackPerimeter venue. */
export const DEFAULT_LOCATION: GeoPoint = { latitude: 33.8095, longitude: -84.2396, label: 'Clarkston, GA (event venue, approximate)' };

const CODES: Record<number, string> = {
  0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'freezing fog',
  51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain',
  66: 'freezing rain', 67: 'heavy freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
  80: 'light showers', 81: 'showers', 82: 'violent showers', 85: 'snow showers', 86: 'heavy snow showers',
  95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'severe thunderstorm with hail',
};

export interface WeatherToolOutput {
  location: string;
  conditions: string;
  temperature_f: number;
  feels_like_f: number;
  humidity_pct: number;
  wind_mph: number;
  today_high_f: number;
  today_low_f: number;
  precipitation_chance_pct: number | null;
  source: string;
}

export async function fetchWeather(loc: GeoPoint): Promise<WeatherToolOutput | { error: string }> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return { error: `Weather service returned ${res.status}` };
    const d = await res.json();
    const c = d.current ?? {};
    const daily = d.daily ?? {};
    return {
      location: loc.label,
      conditions: CODES[c.weather_code as number] ?? 'unknown conditions',
      temperature_f: Math.round(c.temperature_2m),
      feels_like_f: Math.round(c.apparent_temperature),
      humidity_pct: Math.round(c.relative_humidity_2m),
      wind_mph: Math.round(c.wind_speed_10m),
      today_high_f: Math.round(daily.temperature_2m_max?.[0]),
      today_low_f: Math.round(daily.temperature_2m_min?.[0]),
      precipitation_chance_pct: daily.precipitation_probability_max?.[0] ?? null,
      source: 'Open-Meteo live data',
    };
  } catch {
    return { error: 'Weather service unreachable' };
  }
}

/** Browser-only: ask for the user's position, fall back to the venue after a short timeout. */
export function getBrowserLocation(timeoutMs = 5000): Promise<GeoPoint> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(DEFAULT_LOCATION);
    const timer = setTimeout(() => resolve(DEFAULT_LOCATION), timeoutMs + 500);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(timer);
        resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, label: "the survivor's current location" });
      },
      () => {
        clearTimeout(timer);
        resolve(DEFAULT_LOCATION);
      },
      { timeout: timeoutMs, maximumAge: 10 * 60 * 1000 }
    );
  });
}
