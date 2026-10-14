/* Map rendering is optional: the directory remains useful when tiles cannot load. */
window.SpotterMap = (() => {
  "use strict";
  let map,
    ready = false,
    points = [],
    onSelect = () => {},
    selected = null,
    browseCamera = null,
    timeout;
  const colors = [
    "match",
    ["get", "type"],
    "Space",
    "#244e3c",
    "Demo Center",
    "#30536c",
    "Service Center",
    "#715a43",
    "Outpost",
    "#59612e",
    "#46514c",
  ];
  function geo(list) {
    return {
      type: "FeatureCollection",
      features: list
        .filter(
          (p) =>
            LocationModel.coordinates(p) && p.coordinatePrecision === "exact",
        )
        .map((p) => ({
          type: "Feature",
          id: p.id,
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { id: p.id, type: p.type, name: p.name },
        })),
    };
  }
  function failure() {
    document.getElementById("map-failure").hidden = false;
    document.getElementById("map-caption").textContent =
      "List and location details are still available";
  }
  function install() {
    if (!map || map.getSource("places")) return;
    ready = true;
    clearTimeout(timeout);
    document.getElementById("map-failure").hidden = true;
    const mapped = geo(points).features.length;
    document.getElementById("map-caption").textContent = `${mapped} mapped ${mapped === 1 ? "place" : "places"}`;
    map.addSource("places", {
      type: "geojson",
      data: geo(points),
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 42,
    });
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "places",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#37483d",
        "circle-radius": ["step", ["get", "point_count"], 19, 10, 23, 40, 28],
        "circle-stroke-color": "#f8f7f3",
        "circle-stroke-width": 2,
      },
    });
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "places",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 13,
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      },
      paint: { "text-color": "#fff" },
    });
    map.addLayer({
      id: "places",
      type: "circle",
      source: "places",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": colors,
        "circle-radius": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          12,
          8,
        ],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
      },
    });
    if (selected) mark(selected);
  }
  function init(callback) {
    clearTimeout(timeout);
    onSelect = callback || onSelect;
    if (map) {
      map.remove();
      map = null;
    }
    ready = false;
    browseCamera = null;
    document.getElementById("map-failure").hidden = true;
    try {
      if (!window.mapboxgl || !window.RivianSpotterConfig?.mapboxToken)
        throw Error("Map unavailable");
      mapboxgl.accessToken = RivianSpotterConfig.mapboxToken;
      map = new mapboxgl.Map({
        container: "map",
        style:
          document.documentElement.dataset.theme === "dark"
            ? "mapbox://styles/mapbox/dark-v11"
            : "mapbox://styles/mapbox/outdoors-v12",
        center: [-98, 39],
        zoom: 3.4,
        minZoom: 2,
        maxZoom: 18,
        attributionControl: true,
        cooperativeGestures: false,
      });
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.addControl(
        new mapboxgl.ScaleControl({ unit: "imperial" }),
        "bottom-left",
      );
      map.on("style.load", install);
      map.on("click", "places", (e) =>
        onSelect(Number(e.features[0].properties.id)),
      );
      map.on("click", "clusters", (e) => {
        const f = e.features[0];
        map
          .getSource("places")
          .getClusterExpansionZoom(f.properties.cluster_id, (err, zoom) => {
            if (!err)
              map.easeTo({
                center: f.geometry.coordinates,
                zoom,
                duration: 300,
              });
          });
      });
      for (const l of ["places", "clusters"]) {
        map.on("mouseenter", l, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", l, () => {
          map.getCanvas().style.cursor = "";
        });
      }
      map.on("moveend", () => {
        document.getElementById("search-area").hidden = false;
      });
      map.on("error", () => {
        if (!ready) failure();
      });
      timeout = setTimeout(() => {
        if (!ready) failure();
      }, 15000);
    } catch {
      failure();
    }
  }
  function update(list, fit = false) {
    points = list;
    if (ready && map?.getSource("places")) {
      map.getSource("places").setData(geo(list));
      if (fit) fitAll();
    }
  }
  function fitAll() {
    if (!map) return;
    const pts = points.filter(
      (p) => LocationModel.coordinates(p) && p.coordinatePrecision === "exact",
    );
    if (!pts.length) return;
    const bounds = new mapboxgl.LngLatBounds();
    pts.forEach((p) => bounds.extend([p.lng, p.lat]));
    map.fitBounds(bounds, {
      padding: 70,
      maxZoom: 11,
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 500,
    });
  }
  function mark(id) {
    if (ready && map?.getSource("places")) {
      if (selected)
        map.setFeatureState(
          { source: "places", id: selected },
          { selected: false },
        );
      if (id != null)
        map.setFeatureState({ source: "places", id }, { selected: true });
    }
    selected = id;
  }
  function focus(p) {
    mark(p.id);
    if (
      !map ||
      !LocationModel.coordinates(p) ||
      p.coordinatePrecision !== "exact"
    )
      return;
    if (!browseCamera) {
      map.stop();
      browseCamera = {
        center: map.getCenter().toArray(),
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      };
    }
    map.flyTo({
      center: [p.lng, p.lat],
      zoom: 12,
      offset: innerWidth > 760 ? [-160, 0] : [0, -90],
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 500,
    });
  }
  function clearFocus() {
    mark(null);
    const camera = browseCamera;
    browseCamera = null;
    if (!map || !camera) return;
    map.flyTo({
      ...camera,
      offset: [0, 0],
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500,
    });
  }
  function bounds() {
    if (!map || !ready) return null;
    const b = map.getBounds();
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  }
  function theme() {
    if (map) {
      ready = false;
      map.setStyle(
        document.documentElement.dataset.theme === "dark"
          ? "mapbox://styles/mapbox/dark-v11"
          : "mapbox://styles/mapbox/outdoors-v12",
      );
    }
  }
  document.addEventListener("themechange", theme);
  return {
    init,
    update,
    focus,
    clearFocus,
    mark,
    bounds,
    fitAll,
    resize: () => map?.resize(),
  };
})();
