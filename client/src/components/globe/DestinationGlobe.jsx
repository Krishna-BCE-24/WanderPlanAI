import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  ArrowRight,
  Check,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';

import { DESTINATIONS, filterDestinations } from './destinations.js';
import './DestinationGlobe.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

 function DestinationGlobe() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(DESTINATIONS[0]);
  const [journey, setJourney] = useState([]);

  const results = useMemo(
    () => filterDestinations(query).slice(0, 30),
    [query],
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!MAPBOX_TOKEN) {
      setError('Mapbox token missing. Check client/.env.');
      return;
    }

    let disposed = false;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.9629, 22.5937],
      zoom: 1.5,
      projection: 'globe',
      attributionControl: true,
    });

    mapRef.current = map;

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right',
    );
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.on('load', () => {
      if (disposed) return;

      map.setFog({
        color: 'rgb(220, 235, 255)',
        'high-color': 'rgb(36, 92, 170)',
        'space-color': 'rgb(7, 20, 38)',
        'star-intensity': 0.2,
      });

      const geojson = {
        type: 'FeatureCollection',
        features: DESTINATIONS.map((place) => ({
          type: 'Feature',
          properties: {
            name: place.name,
            city: place.city,
            country: place.country,
          },
          geometry: {
            type: 'Point',
            coordinates: [place.lng, place.lat],
          },
        })),
      };

      map.addSource('destination-points', {
        type: 'geojson',
        data: geojson,
      });

      map.addLayer({
        id: 'destination-circles',
        type: 'circle',
        source: 'destination-points',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1, 3,
            5, 6,
            9, 8,
          ],
          'circle-color': '#f59e0b',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });

      map.addLayer({
        id: 'destination-labels',
        type: 'symbol',
        source: 'destination-points',
        minzoom: 3,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#102a43',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });

      DESTINATIONS.forEach((place) => {
        const markerElement = document.createElement('button');
        markerElement.type = 'button';
        markerElement.className = 'wander-globe-marker';
        markerElement.title = place.name;
        markerElement.setAttribute('aria-label', place.name);

        const dot = document.createElement('span');
        dot.className = 'wander-globe-marker-dot';
        markerElement.appendChild(dot);

        markerElement.addEventListener('click', () => {
          setSelected(place);
        });

        const popup = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = place.name;

        const details = document.createElement('p');
        details.textContent = `${place.city}, ${place.country}`;

        popup.append(title, details);

        const marker = new mapboxgl.Marker({
          element: markerElement,
          anchor: 'bottom',
        })
          .setLngLat([place.lng, place.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setDOMContent(popup),
          )
          .addTo(map);

        markersRef.current.push(marker);
      });

      setReady(true);
    });

    map.on('error', (event) => {
      console.error('Mapbox error:', event.error);

      if (!disposed && event.error) {
        setError(event.error.message || 'Unable to load Mapbox.');
      }
    });

    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    mapRef.current?.flyTo({
      center: [selected.lng, selected.lat],
      zoom: 4.5,
      duration: 900,
    });
  }, [selected]);

  function addPlace(place) {
    setJourney((current) =>
      current.some((item) => item.name === place.name)
        ? current
        : [...current, place],
    );
    setSelected(place);
  }

  function removePlace(name) {
    setJourney((current) =>
      current.filter((place) => place.name !== name),
    );
  }

  function resetGlobe() {
    mapRef.current?.flyTo({
      center: [78.9629, 22.5937],
      zoom: 1.5,
      pitch: 0,
      bearing: 0,
      duration: 1000,
    });
  }

  function continueToPlanner() {
    const places = journey.length ? journey : [selected];
    const lastPlace = places[places.length - 1];

    navigate('/trip-planner', {
      state: {
        destination: lastPlace.city || lastPlace.name,
        country: lastPlace.country,
        origin: places.length > 1
          ? places[0].city || places[0].name
          : '',
        destinations: places.map((place) => ({
          name: place.name,
          city: place.city,
          country: place.country,
          lat: place.lat,
          lng: place.lng,
        })),
        source: 'globe',
      },
    });
  }

  return (
    <main className="destination-explorer">
      <header className="destination-hero-copy">
        <span className="destination-eyebrow">
          EXPLORE WITHOUT LIMITS
        </span>

        <h1>
          Explore the world.
          <span>Plan your next journey.</span>
        </h1>

        <p>
          Rotate the 3D globe, explore destinations and add
          places to your journey.
        </p>
      </header>

      <section className="destination-globe-layout">
        <div className="destination-globe-panel">
          <div className="destination-globe-topbar">
            <strong>🌍 INTERACTIVE 3D GLOBE</strong>

            <button type="button" onClick={resetGlobe}>
              <RotateCcw size={16} />
              Reset view
            </button>
          </div>

          <div className="destination-globe-canvas">
            <div
              ref={mapContainerRef}
              className="destination-globe-renderer"
              aria-label="Interactive Mapbox globe"
            />

            {!ready && !error && (
              <div className="destination-globe-message">
                Loading the world...
              </div>
            )}

            {error && (
              <div className="destination-globe-message" role="alert">
                {error}
              </div>
            )}
          </div>

          <p className="destination-globe-hint">
            Drag to rotate · Zoom to explore · Select a pin
          </p>
        </div>

        <aside className="destination-info-panel">
          <span className="destination-eyebrow">
            SELECTED DESTINATION
          </span>

          <div className="destination-info-icon">
            <MapPin size={24} />
          </div>

          <h2>{selected.name}</h2>
          <p>{selected.city}, {selected.country}</p>

          <span className="destination-category">
            {selected.category}
          </span>

          <p className="destination-description">
            {selected.description}
          </p>

          <button
            type="button"
            className="destination-plan-button"
            onClick={() => addPlace(selected)}
          >
            {journey.some((p) => p.name === selected.name)
              ? <Check size={17} />
              : <Plus size={17} />}
            Add to Journey
          </button>

          <button
            type="button"
            className="destination-secondary-button"
            onClick={continueToPlanner}
          >
            Continue to Trip Planner
            <ArrowRight size={17} />
          </button>
        </aside>
      </section>

      <section className="destination-list-section">
        <h2>Discover destinations</h2>

        <label className="destination-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search city, country or attraction..."
          />
        </label>

        <div className="destination-grid">
          {results.map((place) => {
            const added = journey.some(
              (item) => item.name === place.name,
            );

            return (
              <article
                className="destination-card"
                key={place.name}
              >
                <button
                  type="button"
                  className="destination-card-select"
                  onClick={() => setSelected(place)}
                >
                  <MapPin size={18} />
                  <span>
                    <strong>{place.name}</strong>
                    <small>
                      {place.city}, {place.country}
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  className="destination-card-add"
                  onClick={() => addPlace(place)}
                  aria-label={`Add ${place.name} to journey`}
                >
                  {added ? <Check size={17} /> : <Plus size={17} />}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="destination-journey-panel">
        <div className="destination-journey-heading">
          <h2>My Journey ({journey.length})</h2>

          {journey.length > 0 && (
            <button
              type="button"
              onClick={() => setJourney([])}
            >
              Clear
            </button>
          )}
        </div>

        {journey.length === 0 ? (
          <p>Add destinations from the globe or the list above.</p>
        ) : (
          <>
            <ol className="destination-journey-list">
              {journey.map((place, index) => (
                <li key={place.name}>
                  <span>{index + 1}.</span>
                  <div>
                    <strong>{place.name}</strong>
                    <small>
                      {place.city}, {place.country}
                    </small>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${place.name}`}
                    onClick={() => removePlace(place.name)}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ol>

            <button
              type="button"
              className="destination-plan-button"
              onClick={continueToPlanner}
            >
              Plan this journey
              <ArrowRight size={17} />
            </button>
          </>
        )}
      </section>
    </main>
  );
}
export default DestinationGlobe;