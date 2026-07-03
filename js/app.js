// ============================================================
// CONFIG & STATE
// ============================================================
const API_KEY = '8d3355a9ea225ee4233c838ff14728f2';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const state = {
  city: null,
  country: null,
  lat: null,
  lon: null,
  units: 'metric',
  recentSearches: JSON.parse(localStorage.getItem('wp_recent')) || [],
  pinnedCities: JSON.parse(localStorage.getItem('wp_pinned')) || [],
  clockTimer: null,
  ambient: null,        // Ambient canvas renderer
  map: null,            // Leaflet Map object
  chart: null,          // Chart.js instance
  hourlyView: 'list'    // 'list' or 'chart'
};

// ============================================================
// DOM REFERENCES
// ============================================================
const DOM = {
  loader:      document.getElementById('initialLoader'),
  dashboard:   document.getElementById('dashboardData'),
  emptyState:  document.getElementById('emptyState'),
  input:       document.getElementById('cityInput'),
  errorMsg:    document.getElementById('errorMsg'),
  errorText:   document.getElementById('errorText'),
  clearBtn:    document.getElementById('clearBtn'),
  locationBtn: document.getElementById('locationBtn'),
  recentList:  document.getElementById('recentList'),
  recentEmpty: document.getElementById('recentEmpty'),
  unitBtns:    document.querySelectorAll('.unit-btn'),
  
  // Search Autocomplete
  searchSuggestions: document.getElementById('searchSuggestions'),

  // Pinned Locations
  pinnedList:  document.getElementById('pinnedList'),
  pinnedEmpty: document.getElementById('pinnedEmpty'),
  pinCityBtn:  document.getElementById('pinCityBtn'),

  // Topbar
  greeting:    document.getElementById('greeting'),
  currentDate: document.getElementById('currentDate'),
  localTime:   document.getElementById('localTime'),

  // Hero
  cityName:    document.getElementById('cityName'),
  countryCode: document.getElementById('countryCode'),
  weatherDate: document.getElementById('weatherDate'),
  mainIcon:    document.getElementById('mainIcon'),
  temperature: document.getElementById('temperature'),
  weatherDesc: document.getElementById('weatherDesc'),
  tempMax:     document.getElementById('tempMax'),
  tempMin:     document.getElementById('tempMin'),
  heroPrecip:  document.getElementById('heroPrecip'),

  // Stats
  feelsLike:   document.getElementById('feelsLike'),
  feelsDesc:   document.getElementById('feelsDesc'),
  humidity:    document.getElementById('humidity'),
  humidityBar: document.getElementById('humidityBar'),
  windSpeed:   document.getElementById('windSpeed'),
  windUnit:    document.getElementById('windUnit'),
  windDir:     document.getElementById('windDir'),
  visibility:  document.getElementById('visibility'),
  visDesc:     document.getElementById('visDesc'),

  // AQI
  aqiDot:      document.getElementById('aqiDot'),
  aqiValue:    document.getElementById('aqiValue'),
  aqiDesc:     document.getElementById('aqiDesc'),
  pm25:        document.getElementById('pm25'),
  pm10:        document.getElementById('pm10'),
  o3:          document.getElementById('o3'),
  no2:         document.getElementById('no2'),

  // Sun
  sunriseTime: document.getElementById('sunriseTime'),
  sunsetTime:  document.getElementById('sunsetTime'),
  sunArcFill:  document.getElementById('sunArcFill'),
  sunDotPos:   document.getElementById('sunDotPos'),

  // Pressure extras
  pressure:    document.getElementById('pressure'),
  cloudiness:  document.getElementById('cloudiness'),
  dewPoint:    document.getElementById('dewPoint'),
  seaLevel:    document.getElementById('seaLevel'),

  // Lifestyle Indices
  lifestyleAllergy:     document.getElementById('lifestyleAllergy'),
  lifestyleAllergyDesc: document.getElementById('lifestyleAllergyDesc'),
  lifestyleCarWash:     document.getElementById('lifestyleCarWash'),
  lifestyleCarWashDesc: document.getElementById('lifestyleCarWashDesc'),
  lifestyleFitness:     document.getElementById('lifestyleFitness'),
  lifestyleFitnessDesc: document.getElementById('lifestyleFitnessDesc'),
  lifestyleClothing:     document.getElementById('lifestyleClothing'),
  lifestyleClothingDesc: document.getElementById('lifestyleClothingDesc'),

  // Forecast
  forecastContainer: document.getElementById('forecastContainer'),
  hourlyContainer:   document.getElementById('hourlyContainer'),
  hourlyChartContainer: document.getElementById('hourlyChartContainer'),
  
  // Toggles
  hourlyListBtn:  document.getElementById('hourlyListBtn'),
  hourlyChartBtn: document.getElementById('hourlyChartBtn'),
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  setGreeting();
  renderRecentSearches();
  renderPinnedCities();
  setupAutocomplete();
  setupViewToggles();
  setupPinButton();

  // Initialize Ambient Canvas Background
  if (window.AmbientEffects) {
    state.ambient = new window.AmbientEffects('ambientCanvas');
    state.ambient.setWeatherType('default');
  }

  // Show empty state while we wait
  showEmptyState();

  // Hide loader after transition
  setTimeout(() => fadeOutLoader(), 600);

  // Focus input
  DOM.input.focus();
});

// ============================================================
// CLOCK
// ============================================================
function initClock() {
  const now = new Date();
  DOM.currentDate.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  function tick() {
    const t = new Date();
    DOM.localTime.textContent = t.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  tick();
  state.clockTimer = setInterval(tick, 1000);
}

function setGreeting() {
  const h = new Date().getHours();
  if (h < 12) DOM.greeting.textContent = 'Good morning';
  else if (h < 17) DOM.greeting.textContent = 'Good afternoon';
  else DOM.greeting.textContent = 'Good evening';
}

// ============================================================
// EVENT LISTENERS & SETUP HELPERS
// ============================================================

let autocompleteTimeout = null;
function setupAutocomplete() {
  DOM.input.addEventListener('input', (e) => {
    clearTimeout(autocompleteTimeout);
    const query = e.target.value.trim();
    if (query.length < 3) {
      DOM.searchSuggestions.classList.add('hidden');
      return;
    }
    autocompleteTimeout = setTimeout(() => fetchAutocompleteSuggestions(query), 300);
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!DOM.input.contains(e.target) && !DOM.searchSuggestions.contains(e.target)) {
      DOM.searchSuggestions.classList.add('hidden');
    }
  });
}

async function fetchAutocompleteSuggestions(query) {
  try {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    renderAutocompleteSuggestions(data);
  } catch (err) {
    console.error('Autocomplete geocoding error:', err);
  }
}

function renderAutocompleteSuggestions(list) {
  DOM.searchSuggestions.innerHTML = '';
  if (list.length === 0) {
    DOM.searchSuggestions.classList.add('hidden');
    return;
  }

  list.forEach(item => {
    const li = document.createElement('li');
    li.className = 'search-suggestion-item';
    const stateStr = item.state ? `, ${item.state}` : '';
    li.innerHTML = `<i class="fa-solid fa-location-dot" style="font-size:0.75rem; color:var(--text-muted);"></i> <span><strong>${item.name}</strong>${stateStr}, ${item.country}</span>`;
    li.addEventListener('click', () => {
      DOM.input.value = '';
      DOM.searchSuggestions.classList.add('hidden');
      fetchDashboardData(null, item.lat, item.lon);
    });
    DOM.searchSuggestions.appendChild(li);
  });
  DOM.searchSuggestions.classList.remove('hidden');
}

function setupPinButton() {
  DOM.pinCityBtn.addEventListener('click', () => {
    if (!state.city) return;
    const entry = {
      name: state.city,
      country: state.country,
      lat: state.lat,
      lon: state.lon
    };
    const isPinned = state.pinnedCities.some(c => c.name.toLowerCase() === state.city.toLowerCase());

    if (isPinned) {
      state.pinnedCities = state.pinnedCities.filter(c => c.name.toLowerCase() !== state.city.toLowerCase());
      DOM.pinCityBtn.classList.remove('pinned');
      DOM.pinCityBtn.querySelector('i').className = 'fa-regular fa-star';
    } else {
      state.pinnedCities.push(entry);
      DOM.pinCityBtn.classList.add('pinned');
      DOM.pinCityBtn.querySelector('i').className = 'fa-solid fa-star';
    }
    localStorage.setItem('wp_pinned', JSON.stringify(state.pinnedCities));
    renderPinnedCities();
  });
}

function updatePinButtonState() {
  if (!state.city) return;
  const isPinned = state.pinnedCities.some(c => c.name.toLowerCase() === state.city.toLowerCase());
  if (isPinned) {
    DOM.pinCityBtn.classList.add('pinned');
    DOM.pinCityBtn.querySelector('i').className = 'fa-solid fa-star';
  } else {
    DOM.pinCityBtn.classList.remove('pinned');
    DOM.pinCityBtn.querySelector('i').className = 'fa-regular fa-star';
  }
}

function setupViewToggles() {
  DOM.hourlyListBtn.addEventListener('click', () => {
    state.hourlyView = 'list';
    DOM.hourlyListBtn.classList.add('active');
    DOM.hourlyChartBtn.classList.remove('active');
    DOM.hourlyContainer.classList.remove('hidden');
    DOM.hourlyChartContainer.classList.add('hidden');
  });

  DOM.hourlyChartBtn.addEventListener('click', () => {
    state.hourlyView = 'chart';
    DOM.hourlyListBtn.classList.remove('active');
    DOM.hourlyChartBtn.classList.add('active');
    DOM.hourlyContainer.classList.add('hidden');
    DOM.hourlyChartContainer.classList.remove('hidden');
    if (state.chart) state.chart.update();
  });
}

// Enter key search
DOM.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const val = DOM.input.value.trim();
    if (val) triggerSearch(val);
  }
});

// Clear button
DOM.clearBtn.addEventListener('click', () => {
  DOM.input.value = '';
  DOM.input.focus();
});

// Geolocation
DOM.locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation not supported by your browser.');
    return;
  }
  DOM.locationBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Locating...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      DOM.locationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Use my location';
      fetchDashboardData(null, pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      DOM.locationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Use my location';
      showError('Location access denied.');
    }
  );
});

// Unit toggle
DOM.unitBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (e.currentTarget.dataset.unit === state.units) return;
    DOM.unitBtns.forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    state.units = e.currentTarget.dataset.unit;
    if (state.lat !== null && state.lon !== null) {
      fetchDashboardData(null, state.lat, state.lon);
    } else if (state.city) {
      fetchDashboardData(state.city);
    }
  });
});

// ============================================================
// CORE FETCH
// ============================================================
function triggerSearch(city) {
  hideError();
  fetchDashboardData(city);
  DOM.input.value = '';
  DOM.input.blur();
}

async function fetchDashboardData(city, lat = null, lon = null) {
  hideError();
  DOM.dashboard.classList.add('hidden');

  let weatherUrl, forecastUrl;

  if (lat !== null && lon !== null) {
    weatherUrl  = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.units}`;
    forecastUrl = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.units}`;
  } else {
    weatherUrl  = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${state.units}`;
    forecastUrl = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${state.units}`;
  }

  try {
    // Step 1: current weather (need coords for AQI)
    const weatherRes = await fetch(weatherUrl);

    if (!weatherRes.ok) {
      if (weatherRes.status === 404) throw new Error('City not found. Check the spelling.');
      if (weatherRes.status === 401) throw new Error('Invalid API key.');
      throw new Error(`Error ${weatherRes.status}. Please try again.`);
    }

    const weatherData = await weatherRes.json();
    const { lat: cLat, lon: cLon } = weatherData.coord;
    
    state.city = weatherData.name;
    state.country = weatherData.sys.country;
    state.lat = cLat;
    state.lon = cLon;

    const aqiUrl = `${BASE_URL}/air_pollution?lat=${cLat}&lon=${cLon}&appid=${API_KEY}`;

    // Step 2: forecast + AQI in parallel
    const [forecastRes, aqiRes] = await Promise.all([
      fetch(forecastUrl),
      fetch(aqiUrl),
    ]);

    const forecastData = await forecastRes.json();
    const aqiData = await aqiRes.json();

    // Step 3: render
    renderAll(weatherData, forecastData, aqiData);
    saveRecentSearch(weatherData.name, weatherData.sys.country);

  } catch (err) {
    showError(err.message);
    showEmptyState();
  }
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll(weather, forecast, aqi) {
  renderHero(weather);
  renderStats(weather);
  renderAQI(aqi, weather);
  renderSunArc(weather);
  renderExtras(weather);
  renderForecast(forecast);
  renderHourly(forecast);
  
  // Premium widgets
  renderLifestyle(weather, aqi);
  renderChart(forecast);
  renderMap(weather.coord.lat, weather.coord.lon);
  updatePinButtonState();

  applyTheme(weather.weather[0].id, weather.weather[0].icon);

  DOM.emptyState.classList.add('hidden');
  DOM.dashboard.classList.remove('hidden');

  // Force map redraw to prevent leaflet rendering grid splits
  if (state.map) {
    setTimeout(() => state.map.invalidateSize(), 150);
  }
}

// ============================================================
// HERO
// ============================================================
function renderHero(data) {
  DOM.cityName.textContent    = data.name;
  DOM.countryCode.textContent = data.sys.country;
  DOM.temperature.textContent = Math.round(data.main.temp);
  DOM.weatherDesc.textContent = data.weather[0].description;
  DOM.mainIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;

  DOM.tempMax.textContent    = Math.round(data.main.temp_max);
  DOM.tempMin.textContent    = Math.round(data.main.temp_min);
  DOM.heroPrecip.textContent = data.clouds ? data.clouds.all : '--';

  const now = new Date();
  DOM.weatherDate.textContent = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
}

// ============================================================
// STATS CARDS
// ============================================================
function renderStats(data) {
  // Feels Like
  const feels = Math.round(data.main.feels_like);
  const actual = Math.round(data.main.temp);
  DOM.feelsLike.textContent = feels;
  DOM.feelsDesc.textContent = feels > actual
    ? 'Humidity making it warmer'
    : feels < actual
    ? 'Wind making it cooler'
    : 'Matches actual temp';

  // Humidity
  DOM.humidity.textContent = data.main.humidity;
  DOM.humidityBar.style.width = `${data.main.humidity}%`;

  // Wind
  const isMetric = state.units === 'metric';
  DOM.windSpeed.textContent = isMetric
    ? Math.round(data.wind.speed * 3.6)
    : Math.round(data.wind.speed);
  DOM.windUnit.textContent = isMetric ? 'km/h' : 'mph';
  DOM.windDir.textContent = data.wind.deg;

  // Visibility
  const visKm = (data.visibility / 1000).toFixed(1);
  DOM.visibility.textContent = visKm;
  DOM.visDesc.textContent =
    visKm >= 10 ? 'Excellent visibility' :
    visKm >= 5  ? 'Good visibility' :
    visKm >= 2  ? 'Moderate visibility' :
    'Poor visibility';
}

// ============================================================
// AQI
// ============================================================
const AQI_MAP = {
  1: { label: 'Good',      color: '#4ade80', pct: 10 },
  2: { label: 'Fair',      color: '#facc15', pct: 30 },
  3: { label: 'Moderate',  color: '#fb923c', pct: 50 },
  4: { label: 'Poor',      color: '#f87171', pct: 75 },
  5: { label: 'Very Poor', color: '#991b1b', pct: 95 },
};

function renderAQI(aqiData, weatherData) {
  const idx = aqiData.list[0].main.aqi;
  const comp = aqiData.list[0].components;
  const info = AQI_MAP[idx];

  DOM.aqiValue.textContent = idx;
  DOM.aqiValue.style.color = info.color;
  DOM.aqiDesc.textContent  = info.label;
  DOM.aqiDot.style.left    = `${info.pct}%`;

  DOM.pm25.textContent = comp.pm2_5.toFixed(1);
  DOM.pm10.textContent = comp.pm10.toFixed(1);
  DOM.o3.textContent   = comp.o3.toFixed(1);
  DOM.no2.textContent  = comp.no2.toFixed(1);
}

// ============================================================
// SUN ARC
// ============================================================
function renderSunArc(data) {
  const rise = data.sys.sunrise;
  const set  = data.sys.sunset;
  const tz   = data.timezone;

  DOM.sunriseTime.textContent = formatUnixTime(rise, tz);
  DOM.sunsetTime.textContent  = formatUnixTime(set, tz);

  // Progress of sun along arc
  const now = Math.floor(Date.now() / 1000);
  let pct = (now - rise) / (set - rise);
  pct = Math.max(0, Math.min(1, pct));

  // SVG arc: path goes from (10,100) to (190,100) via top (100,10)
  // Parameterise position along the arc
  const angle = Math.PI * pct; // 0 = left (sunrise), PI = right (sunset)
  const cx = 100, cy = 100, r = 90;
  const x = cx + r * Math.cos(Math.PI - angle);
  const y = cy - r * Math.sin(angle);

  DOM.sunDotPos.setAttribute('cx', x.toFixed(1));
  DOM.sunDotPos.setAttribute('cy', y.toFixed(1));

  // Shorten arc fill to match progress
  const totalLen = 283;
  const offset = totalLen * (1 - pct);
  DOM.sunArcFill.setAttribute('stroke-dashoffset', offset.toFixed(1));
}

// ============================================================
// EXTRAS (PRESSURE CARD)
// ============================================================
function renderExtras(data) {
  DOM.pressure.textContent   = data.main.pressure;
  DOM.cloudiness.textContent = data.clouds.all;
  DOM.seaLevel.textContent   = data.main.sea_level || data.main.pressure;

  // Dew point approximation: Td ≈ T - ((100 - RH) / 5)
  const dewPt = Math.round(data.main.temp - ((100 - data.main.humidity) / 5));
  DOM.dewPoint.textContent = dewPt;
}

// ============================================================
// 5-DAY FORECAST
// ============================================================
function renderForecast(forecast) {
  DOM.forecastContainer.innerHTML = '';
  
  // Group the 3-hour forecasts by date
  const groups = {};
  forecast.list.forEach(item => {
    const dateStr = new Date(item.dt * 1000).toDateString();
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(item);
  });

  const dayKeys = Object.keys(groups).slice(0, 5);
  const todayStr = new Date().toDateString();

  dayKeys.forEach(dateKey => {
    const items = groups[dateKey];
    let minTemp = Infinity;
    let maxTemp = -Infinity;
    
    // Select the midday condition to represent the day
    let midItem = items[0];
    let minDiff = Infinity;

    items.forEach(item => {
      if (item.main.temp_min < minTemp) minTemp = item.main.temp_min;
      if (item.main.temp_max > maxTemp) maxTemp = item.main.temp_max;

      const hour = new Date(item.dt * 1000).getHours();
      const diff = Math.abs(hour - 12);
      if (diff < minDiff) {
        minDiff = diff;
        midItem = item;
      }
    });

    const date = new Date(midItem.dt * 1000);
    const isToday = dateKey === todayStr;
    const dayLabel = isToday
      ? 'Today'
      : date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

    const el = document.createElement('div');
    el.className = `forecast-item${isToday ? ' today' : ''}`;
    el.innerHTML = `
      <span class="forecast-day">${dayLabel}</span>
      <img class="forecast-icon" src="https://openweathermap.org/img/wn/${midItem.weather[0].icon}@2x.png" alt="${midItem.weather[0].description}" />
      <div class="forecast-temp-range">
        <span class="forecast-high">${Math.round(maxTemp)}°</span>
        <span class="forecast-low">${Math.round(minTemp)}°</span>
      </div>
      <span class="forecast-desc">${midItem.weather[0].description}</span>
    `;
    DOM.forecastContainer.appendChild(el);
  });
}

// ============================================================
// HOURLY FORECAST
// ============================================================
function renderHourly(forecast) {
  DOM.hourlyContainer.innerHTML = '';
  const items = forecast.list.slice(0, 12); // next 36 hours (3h intervals)
  const nowHour = new Date().getHours();

  items.forEach((item, idx) => {
    const date = new Date(item.dt * 1000);
    const hour = date.getHours();
    const isNow = idx === 0;

    const timeLabel = isNow
      ? 'Now'
      : date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

    const el = document.createElement('div');
    el.className = `hourly-item${isNow ? ' now' : ''}`;
    el.innerHTML = `
      <span class="hourly-time">${timeLabel}</span>
      <img class="hourly-icon" src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="" />
      <span class="hourly-temp">${Math.round(item.main.temp)}°</span>
    `;
    DOM.hourlyContainer.appendChild(el);
  });
}

// ============================================================
// THEME
// ============================================================
function applyTheme(id, icon) {
  const isNight = icon.endsWith('n');
  document.body.className = '';

  let wType = 'default';
  if (isNight) {
    document.body.classList.add('theme-default');
    wType = 'default';
  } else if (id >= 200 && id < 300) {
    document.body.classList.add('theme-thunderstorm');
    wType = 'thunderstorm';
  } else if (id >= 300 && id < 600) {
    document.body.classList.add('theme-rain');
    wType = 'rain';
  } else if (id >= 600 && id < 700) {
    document.body.classList.add('theme-snow');
    wType = 'snow';
  } else if (id === 800) {
    document.body.classList.add('theme-clear');
    wType = 'clear';
  } else if (id > 800) {
    document.body.classList.add('theme-clouds');
    wType = 'clouds';
  } else {
    document.body.classList.add('theme-default');
  }

  // Set particle effects matching current active weather
  if (state.ambient) {
    state.ambient.setWeatherType(wType);
  }
}

// ============================================================
// RECENT SEARCHES
// ============================================================
function saveRecentSearch(city, country) {
  const entry = `${city}, ${country}`;
  state.recentSearches = state.recentSearches.filter(s => s !== entry);
  state.recentSearches.unshift(entry);
  if (state.recentSearches.length > 6) state.recentSearches.pop();
  localStorage.setItem('wp_recent', JSON.stringify(state.recentSearches));
  renderRecentSearches();
}

function renderRecentSearches() {
  DOM.recentList.innerHTML = '';

  if (state.recentSearches.length === 0) {
    DOM.recentEmpty.classList.remove('hidden');
    return;
  }

  DOM.recentEmpty.classList.add('hidden');

  state.recentSearches.forEach(entry => {
    const city = entry.split(',')[0].trim();
    const li = document.createElement('li');
    li.className = 'recent-item';
    li.innerHTML = `
      <div class="recent-item-icon"><i class="fa-solid fa-location-dot"></i></div>
      <span class="recent-item-name">${entry}</span>
      <i class="fa-solid fa-chevron-right recent-item-arrow"></i>
    `;
    li.addEventListener('click', () => triggerSearch(city));
    DOM.recentList.appendChild(li);
  });
}

// ============================================================
// HELPERS
// ============================================================
function formatUnixTime(unix, tzOffset) {
  const d = new Date((unix + tzOffset) * 1000);
  let h = d.getUTCHours();
  let m = d.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function showError(msg) {
  DOM.errorText.textContent = msg;
  DOM.errorMsg.classList.remove('hidden');
}

function hideError() {
  DOM.errorMsg.classList.add('hidden');
}

function showEmptyState() {
  DOM.emptyState.classList.remove('hidden');
  DOM.dashboard.classList.add('hidden');
}

function fadeOutLoader() {
  DOM.loader.style.opacity = '0';
  setTimeout(() => DOM.loader.classList.add('hidden'), 500);
}

// ============================================================
// MAP INTEGRATION (LEAFLET.JS)
// ============================================================
function renderMap(lat, lon) {
  try {
    const mapContainer = document.getElementById('weatherMap');
    if (!mapContainer) return;

    if (!state.map) {
      state.map = L.map('weatherMap', {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true
      }).setView([lat, lon], 9);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(state.map);
    } else {
      state.map.setView([lat, lon], 9);
    }

    if (state.mapLayer) {
      state.map.removeLayer(state.mapLayer);
    }

    // Leaflet OpenWeather tiles overlay (clouds / precipitation)
    const weatherTileUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
    state.mapLayer = L.tileLayer(weatherTileUrl, {
      maxZoom: 20,
      opacity: 0.7
    });
    state.mapLayer.addTo(state.map);

  } catch (err) {
    console.error('Leaflet radar map render error:', err);
  }
}

// ============================================================
// CHART INTEGRATION (CHART.JS)
// ============================================================
function renderChart(forecast) {
  try {
    const chartCanvas = document.getElementById('hourlyChart');
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');
    const items = forecast.list.slice(0, 10); // next 10 items (30 hours)

    const labels = items.map(item => {
      const date = new Date(item.dt * 1000);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    });

    const temps = items.map(item => Math.round(item.main.temp));

    if (state.chart) {
      state.chart.destroy();
    }

    // Custom glowing gradient line decoration
    const lineGradient = ctx.createLinearGradient(0, 0, 0, 180);
    lineGradient.addColorStop(0, 'rgba(96, 165, 250, 0.45)');
    lineGradient.addColorStop(1, 'rgba(96, 165, 250, 0)');

    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Temperature',
          data: temps,
          borderColor: '#60a5fa',
          borderWidth: 3,
          pointBackgroundColor: '#60a5fa',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          backgroundColor: lineGradient,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { family: 'Outfit', size: 12 },
            bodyFont: { family: 'Outfit', size: 13, weight: 'bold' },
            padding: 10,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y}°`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Outfit', size: 10 }
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Outfit', size: 10 },
              callback: (val) => `${val}°`
            }
          }
        }
      }
    });

  } catch (err) {
    console.error('Chart.js rendering error:', err);
  }
}

// ============================================================
// SMART RECOMMENDATIONS & LIFESTYLE INDICES
// ============================================================
function renderLifestyle(weather, aqi) {
  const temp = weather.main.temp;
  const humidity = weather.main.humidity;
  const id = weather.weather[0].id;
  const aqiVal = aqi.list[0].main.aqi;

  // 1. Allergy Pollen Risk
  let allergyValue = 'Low';
  let allergyDesc = 'Clear air and no major pollen hazards.';
  if (id === 800 && temp >= 18) {
    allergyValue = 'High';
    allergyDesc = 'High pollen counts expected. Keep antihistamines handy.';
  } else if (id > 800 && temp >= 15) {
    allergyValue = 'Moderate';
    allergyDesc = 'Cloudy conditions stable, low ambient wind.';
  } else if (humidity > 75) {
    allergyValue = 'Moderate';
    allergyDesc = 'High humidity levels could increase mould counts.';
  } else if (id < 600) {
    allergyValue = 'Low';
    allergyDesc = 'Active rainfall washed out pollen dust particles.';
  }
  DOM.lifestyleAllergy.textContent = allergyValue;
  DOM.lifestyleAllergyDesc.textContent = allergyDesc;

  // 2. Car Wash Index
  let carWashValue = 'Excellent';
  let carWashDesc = 'Dry, clear skies make today the perfect day.';
  if (id < 700) {
    carWashValue = 'Avoid';
    carWashDesc = 'Precipitation active or expected. Skip the wash.';
  } else if (humidity > 80) {
    carWashValue = 'Fair';
    carWashDesc = 'Damp moisture in the air will delay drying times.';
  } else if (id > 800) {
    carWashValue = 'Good';
    carWashDesc = 'Cloudy slots, but conditions remain dry and pleasant.';
  }
  DOM.lifestyleCarWash.textContent = carWashValue;
  DOM.lifestyleCarWashDesc.textContent = carWashDesc;

  // 3. Outdoor Fitness
  let fitnessValue = 'Excellent';
  let fitnessDesc = 'Great weather for outdoor running and cycling.';
  if (id < 700) {
    fitnessValue = 'Avoid';
    fitnessDesc = 'Precipitation active. Indoor workout sessions recommended.';
  } else if (aqiVal >= 4) {
    fitnessValue = 'Avoid';
    fitnessDesc = 'Poor air quality. Stay indoors for physical activities.';
  } else if (temp > 32) {
    fitnessValue = 'Moderate';
    fitnessDesc = 'High heat index. Avoid afternoon runs and hydrate.';
  } else if (temp < 5) {
    fitnessValue = 'Chilly';
    fitnessDesc = 'Cold climate. Wear warm thermals if doing workouts.';
  }
  DOM.lifestyleFitness.textContent = fitnessValue;
  DOM.lifestyleFitnessDesc.textContent = fitnessDesc;

  // 4. Clothing Guide
  let clothingValue = 'Light Wear';
  let clothingDesc = 'T-shirt, shorts, and light outfits are ideal.';
  if (temp < 8) {
    clothingValue = 'Heavy Layers';
    clothingDesc = 'Winter coat, gloves, and thick layers required.';
  } else if (temp >= 8 && temp < 15) {
    clothingValue = 'Jackets/Sweater';
    clothingDesc = 'Layer up with a warm jacket or a cardigan.';
  } else if (temp >= 15 && temp < 22) {
    clothingValue = 'Smart Casual';
    clothingDesc = 'Full sleeve shirt, light sweater or hoodies.';
  } else if (temp >= 22 && temp < 28) {
    clothingValue = 'Casuals';
    clothingDesc = 'Breathable light outfits. Sunscreen recommended.';
  }
  
  if (id < 600) {
    clothingDesc += ' Bring an umbrella/rain jacket.';
  }
  DOM.lifestyleClothing.textContent = clothingValue;
  DOM.lifestyleClothingDesc.textContent = clothingDesc;
}

// ============================================================
// PINNED LOCATIONS (BOOKMARKS)
// ============================================================
function renderPinnedCities() {
  DOM.pinnedList.innerHTML = '';
  
  if (state.pinnedCities.length === 0) {
    DOM.pinnedEmpty.classList.remove('hidden');
    return;
  }
  
  DOM.pinnedEmpty.classList.add('hidden');
  
  state.pinnedCities.forEach(cityObj => {
    const li = document.createElement('li');
    li.className = 'pinned-item';
    li.innerHTML = `
      <div class="pinned-item-left">
        <span class="pinned-item-name">${cityObj.name}</span>
        <span class="pinned-item-desc" id="pinned-desc-${cityObj.name.replace(/\s+/g, '')}">Loading...</span>
      </div>
      <div class="pinned-item-right">
        <span class="pinned-item-temp" id="pinned-temp-${cityObj.name.replace(/\s+/g, '')}">--°</span>
        <button class="pinned-item-delete" title="Delete pin" data-city="${cityObj.name}">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
    
    // Clicking lists switches dashboard focus
    li.addEventListener('click', (e) => {
      if (e.target.closest('.pinned-item-delete')) return;
      fetchDashboardData(null, cityObj.lat, cityObj.lon);
    });
    
    // Bind delete trigger
    const delBtn = li.querySelector('.pinned-item-delete');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.pinnedCities = state.pinnedCities.filter(c => c.name.toLowerCase() !== cityObj.name.toLowerCase());
      localStorage.setItem('wp_pinned', JSON.stringify(state.pinnedCities));
      renderPinnedCities();
      updatePinButtonState();
    });

    DOM.pinnedList.appendChild(li);
    
    // Fetch live details
    fetchPinnedCityTemp(cityObj);
  });
}

async function fetchPinnedCityTemp(cityObj) {
  try {
    const url = `${BASE_URL}/weather?lat=${cityObj.lat}&lon=${cityObj.lon}&appid=${API_KEY}&units=${state.units}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    
    const safeName = cityObj.name.replace(/\s+/g, '');
    const descEl = document.getElementById(`pinned-desc-${safeName}`);
    const tempEl = document.getElementById(`pinned-temp-${safeName}`);
    
    if (descEl) descEl.textContent = data.weather[0].description;
    if (tempEl) tempEl.textContent = `${Math.round(data.main.temp)}°`;
  } catch (err) {
    console.error('Error fetching pinned temp:', err);
  }
}
