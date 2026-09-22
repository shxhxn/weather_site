# WeatherPro

A responsive weather dashboard built with vanilla HTML, CSS, and JavaScript. It combines current conditions, forecasts, air-quality data, mapping, charts, and personalized city lists in a desktop-style interface.

## Highlights

- City search with suggestions and browser geolocation
- Current conditions, five-day forecast, and hourly views
- Air-quality readings and weather-derived lifestyle guidance
- Interactive Leaflet map and Chart.js visualizations
- Celsius/Fahrenheit switching
- Pinned locations and recent searches stored in the browser
- Weather-aware ambient effects and responsive layouts

## Run locally

1. Get an API key from OpenWeather.
2. Copy the example configuration:

   ```bash
   cp js/config.example.js js/config.js
   ```

3. Put the key in `js/config.js`:

   ```js
   window.WEATHERPRO_CONFIG = {
     apiKey: "your_openweathermap_api_key",
   };
   ```

4. Serve the project with any local static server, for example:

   ```bash
   python -m http.server 8000
   ```

5. Open `http://localhost:8000`.

## Security note

`js/config.js` is intentionally ignored by Git. Do not commit real API keys.

A key used directly by browser JavaScript is visible to visitors at runtime. For a public deployment, route weather requests through a backend or serverless function, keep the key server-side, and apply provider-side usage restrictions.

## Tech stack

HTML5 · CSS3 · JavaScript · OpenWeather API · Leaflet · Chart.js · Font Awesome

## Project structure

```text
.
├── index.html
├── css/
│   └── style.css
└── js/
    ├── ambient-effects.js
    ├── app.js
    └── config.example.js
```
