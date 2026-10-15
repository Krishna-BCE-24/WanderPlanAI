import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const ROUTE_COLORS = ['#3988ff', '#f59e0b', '#64748b'];
const SOURCE_PREFIX = 'wanderplan-route-source-';
const LAYER_PREFIX = 'wanderplan-route-layer-';

async function geocodePlace(place) {
  const query = encodeURIComponent(place);

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
  );

  if (!response.ok) {
    throw new Error('Location search failed. Check your Mapbox token.');
  }

  const data = await response.json();
  const feature = data.features?.[0];

  if (!feature?.center) {
    throw new Error(`Location not found: ${place}`);
  }

  return {
    name: feature.place_name || place,
    longitude: feature.center[0],
    latitude: feature.center[1],
  };
}

function formatDistance(km) {
  return km < 1
    ? `${Math.round(km * 1000)} m`
    : `${km.toFixed(1)} km`;
}

function formatDuration(minutes) {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  return hours
    ? `${hours} hr ${mins} min`
    : `${mins} min`;
}

export default function MapView({
  origin = '',
  destination = '',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const [mapReady, setMapReady] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState('');
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);

  // Initialize map only once.
  useEffect(() => {
    if (!containerRef.current) return;

    if (!MAPBOX_TOKEN) {
      setError('Mapbox token missing. Check client/.env.');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.9629, 22.5937],
      zoom: 4,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.addControl(
      new mapboxgl.ScaleControl({ unit: 'metric' }),
      'bottom-left',
    );

    const handleLoad = () => setMapReady(true);

    const handleMapError = (event) => {
      console.error('Mapbox error:', event.error);
    };

    map.on('load', handleLoad);
    map.on('error', handleMapError);

    return () => {
      map.off('load', handleLoad);
      map.off('error', handleMapError);

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Geocode places and request road routes.
  useEffect(() => {
    const map = mapRef.current;

    if (
      !mapReady ||
      !map ||
      !origin.trim() ||
      !destination.trim()
    ) {
      setRoutes([]);
      setError('');
      return;
    }

    let cancelled = false;

    async function loadRoutes() {
      setLoadingRoute(true);
      setError('');
      setRoutes([]);
      setSelectedRoute(0);

      try {
        const [start, end] = await Promise.all([
          geocodePlace(origin.trim()),
          geocodePlace(destination.trim()),
        ]);

        if (cancelled) return;

        // Clear previous routes.
        for (let i = 0; i < 3; i += 1) {
          const layerId = `${LAYER_PREFIX}${i}`;
          const sourceId = `${SOURCE_PREFIX}${i}`;

          if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }

          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
        }

        markersRef.current.forEach((marker) => marker.remove());

        markersRef.current = [
          new mapboxgl.Marker({ color: '#3988ff' })
            .setLngLat([start.longitude, start.latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 24 }).setText(
                `Start: ${start.name}`,
              ),
            )
            .addTo(map),

          new mapboxgl.Marker({ color: '#f59e0b' })
            .setLngLat([end.longitude, end.latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 24 }).setText(
                `Destination: ${end.name}`,
              ),
            )
            .addTo(map),
        ];

        const coordinates =
          `${start.longitude},${start.latitude};` +
          `${end.longitude},${end.latitude}`;

        const url =
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}` +
          `?alternatives=true&geometries=geojson&overview=full` +
          `&steps=true&access_token=${MAPBOX_TOKEN}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            'Route calculation failed. Check Mapbox Directions API access.',
          );
        }

        const data = await response.json();

        if (cancelled) return;

        if (!Array.isArray(data.routes) || data.routes.length === 0) {
          throw new Error(
            'No driving route was found between these locations.',
          );
        }

        const availableRoutes = data.routes.slice(0, 3);
        const bounds = new mapboxgl.LngLatBounds();

        const normalizedRoutes = availableRoutes.map((route, index) => {
          route.geometry.coordinates.forEach((coordinate) => {
            bounds.extend(coordinate);
          });

          return {
            id: index,
            distanceKm: route.distance / 1000,
            durationMinutes: route.duration / 60,
            geometry: route.geometry,
          };
        });

        // Draw alternatives first, suggested route last.
        [...normalizedRoutes]
          .sort((a, b) => b.id - a.id)
          .forEach((route) => {
            const index = route.id;
            const sourceId = `${SOURCE_PREFIX}${index}`;
            const layerId = `${LAYER_PREFIX}${index}`;

            map.addSource(sourceId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: { routeIndex: index },
                geometry: route.geometry,
              },
            });

            // White outline makes routes easier to see.
            map.addLayer({
              id: `${layerId}-casing`,
              type: 'line',
              source: sourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#ffffff',
                'line-width': index === 0 ? 12 : 9,
                'line-opacity': 0.9,
              },
            });

            map.addLayer({
              id: layerId,
              type: 'line',
              source: sourceId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': ROUTE_COLORS[index],
                'line-width': index === 0 ? 7 : 5,
                'line-opacity': index === 0 ? 1 : 0.75,
              },
            });

            // Click route directly on map.
            map.on('click', layerId, () => {
              setSelectedRoute(index);
            });

            map.on('mouseenter', layerId, () => {
              map.getCanvas().style.cursor = 'pointer';
            });

            map.on('mouseleave', layerId, () => {
              map.getCanvas().style.cursor = '';
            });
          });

        setRoutes(normalizedRoutes);

        map.fitBounds(bounds, {
          padding: 70,
          maxZoom: 12,
          duration: 700,
        });

        requestAnimationFrame(() => map.resize());
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || 'Unable to load routes.');
        }
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    }

    loadRoutes();

    return () => {
      cancelled = true;

      // Avoid touching a map instance that has already been removed or replaced.
      if (!mapRef.current || mapRef.current !== map) return;

      try {
        // Style-dependent operations are only safe after the style is available.
        if (map.isStyleLoaded()) {
          for (let i = 0; i < 3; i += 1) {
            const layerId = `${LAYER_PREFIX}${i}`;
            const casingId = `${layerId}-casing`;
            const sourceId = `${SOURCE_PREFIX}${i}`;

            if (map.getLayer(layerId)) {
              map.removeLayer(layerId);
            }

            if (map.getLayer(casingId)) {
              map.removeLayer(casingId);
            }

            if (map.getSource(sourceId)) {
              map.removeSource(sourceId);
            }
          }
        }
      } catch (cleanupError) {
        console.warn('Map route cleanup skipped:', cleanupError);
      }
    };
  }, [origin, destination, mapReady]);

  // Keep line styling synced with selected route.
  useEffect(() => {
    const map = mapRef.current;

    if (!mapReady || !map || routes.length === 0) return;

    routes.forEach((route, index) => {
      const layerId = `${LAYER_PREFIX}${index}`;

      if (!map.getLayer(layerId)) return;

      const isSelected = index === selectedRoute;

      map.setPaintProperty(
        layerId,
        'line-color',
        ROUTE_COLORS[index],
      );
      map.setPaintProperty(
        layerId,
        'line-width',
        isSelected ? 8 : 5,
      );
      map.setPaintProperty(
        layerId,
        'line-opacity',
        isSelected ? 1 : 0.65,
      );
    });
  }, [routes, selectedRoute, mapReady]);

  const activeRoute = routes[selectedRoute];

  return (
    <section
      className="wanderplan-map-section"
      aria-labelledby="wanderplan-map-title"
    >
      <div className="wanderplan-map-heading">
        <div>
          <span className="trip-eyebrow">MAP &amp; ROUTES</span>
          <h2 id="wanderplan-map-title">Explore your route</h2>
          <p>
            Click a colored route on the map or choose an option below.
          </p>
        </div>
      </div>

      {(!origin.trim() || !destination.trim()) && (
        <p className="wanderplan-map-message">
          Add a starting location and destination to view routes.
        </p>
      )}

      <div
        ref={containerRef}
        className="wanderplan-map"
        aria-label="Interactive map showing selectable trip routes"
      />

      {loadingRoute && (
        <p className="wanderplan-map-message">
          Finding locations and calculating routes...
        </p>
      )}

      {error && (
        <p className="wanderplan-map-error" role="alert">
          {error}
        </p>
      )}

      {activeRoute && (
        <div
          className="wanderplan-selected-route-summary"
          aria-live="polite"
        >
          <span
            className="wanderplan-selected-route-dot"
            style={{ backgroundColor: ROUTE_COLORS[selectedRoute] }}
          />

          <div>
            <strong>
              {selectedRoute === 0
                ? 'Suggested route selected'
                : `Alternative ${selectedRoute} selected`}
            </strong>

            <p>
              {formatDistance(activeRoute.distanceKm)} ·{' '}
              {formatDuration(activeRoute.durationMinutes)} estimated driving
            </p>
          </div>
        </div>
      )}

      {routes.length > 0 && (
        <div className="wanderplan-route-options">
          {routes.map((route, index) => {
            const isSelected = selectedRoute === index;

            return (
              <button
                key={route.id}
                type="button"
                className={`wanderplan-route-option ${
                  isSelected ? 'is-selected' : ''
                }`}
                onClick={() => setSelectedRoute(index)}
                aria-pressed={isSelected}
              >
                <span className="wanderplan-route-option-top">
                  <strong>
                    {index === 0
                      ? 'Suggested route'
                      : `Alternative ${index}`}
                  </strong>

                  <span
                    className="wanderplan-route-swatch"
                    style={{ backgroundColor: ROUTE_COLORS[index] }}
                  />
                </span>

                <span className="wanderplan-route-distance">
                  {formatDistance(route.distanceKm)}
                </span>

                <small>
                  {formatDuration(route.durationMinutes)} estimated driving
                </small>

                <small>
                  {isSelected ? 'Currently selected' : 'Click to select'}
                </small>
              </button>
            );
          })}
        </div>
      )}

      <p className="wanderplan-map-disclaimer">
        Route distances and times are driving estimates. Actual travel may
        vary with traffic, road conditions and map coverage.
      </p>
    </section>
  );
}
