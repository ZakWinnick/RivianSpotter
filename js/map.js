/* Map rendering is optional: the directory remains useful when tiles cannot load. */
window.SpotterMap = (() => {
  "use strict";
  let map,
    ready = false,
    points = [],
    onSelect = () => {},
    selected = null,
    detailCenter = null,
    timeout;
  const overview = () => ({center: [-98, 39], zoom: innerWidth > 760 ? 3.4 : 2, bearing: 0, pitch: 0});
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
    "RAN",
    "#b4621a",
    "Waypoint",
    "#7062a4",
    "#46514c",
  ];
  function geo(list) {
    return {
      type: "FeatureCollection",
      features: list
        .filter(
          (p) =>
            LocationModel.isMapped(p),
        )
        .map((p) => ({
          type: "Feature",
          id: p.id,
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { id: p.id, type: p.type, name: p.name, planned: p.status === "planned", combined: !!p.chargingNetworks },
        })),
    };
  }
  function failure() {
    document.getElementById("map-failure").hidden = false;
    document.getElementById("map-caption").textContent =
      "List and location details are still available";
  }
  // Type symbols drawn from the same stroke icons the site uses, so markers match the app.
  const typePaths = {
    Space: "M4 21V8l8-5 8 5v13M1 21h22M9 21v-7h6v7",
    "Demo Center": "m3 11 2-6h14l2 6M2 11h20v8H2v-8Zm3 8v3m14-3v3",
    "Service Center": "m14 3-3 4 2 4 4 2 4-3a7 7 0 0 1-9 9L5 23l-4-4 7-7a7 7 0 0 1 6-9Z",
    Outpost: "m2 21 10-18 10 18H2Zm6 0 4-7 4 7",
    RAN: "m13 2-9 12h7l-1 8 10-12h-7l1-8Z",
    Waypoint: "M8 2v5m8-5v5M6 7h12v4a6 6 0 0 1-12 0V7Zm6 10v5",
  };
  function addTypeIcons() {
    if (!map?.addImage || typeof document.createElement !== "function" || typeof Path2D === "undefined") return;
    for (const [type, d] of Object.entries(typePaths))
      for (const planned of [false, true]) {
        const name = "spot-" + type + (planned ? "-planned" : "");
        if (map.hasImage?.(name)) continue;
        const size = 40, canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.translate(8, 8);
        ctx.scale(1, 1);
        ctx.lineWidth = 2.6;
        ctx.lineCap = ctx.lineJoin = "round";
        ctx.strokeStyle = planned ? "#b4621a" : "#ffffff";
        ctx.stroke(new Path2D(d));
        map.addImage(name, ctx.getImageData(0, 0, size, size), { pixelRatio: 2 });
      }
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
        "circle-color": document.documentElement.dataset.theme === "dark" ? "#3a3a3c" : "#2c2c2e",
        "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 40, 27],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3,
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
        "circle-color": ["case", ["==", ["get", "planned"], true], "#f8f7f3", colors],
        "circle-radius": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          17,
          13,
        ],
        "circle-stroke-width": ["case", ["boolean", ["feature-state", "selected"], false], 4, 2.5],
        "circle-stroke-color": ["case", ["==", ["get", "planned"], true], "#b4621a", ["==", ["get", "combined"], true], "#7062a4", "#ffffff"],
      },
    });
    addTypeIcons();
    map.addLayer({id:"place-icons",type:"symbol",source:"places",filter:["!",["has","point_count"]],layout:{"icon-image":["concat","spot-",["get","type"],["case",["==",["get","planned"],true],"-planned",""]],"icon-size":0.95,"icon-allow-overlap":true,"icon-ignore-placement":true}});
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
    detailCenter = null;
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
            : "mapbox://styles/mapbox/light-v11",
        ...overview(),
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
      // The finder floats over the map on wider screens; frame the camera beside it.
      const pad = () => {
        const finder = document.getElementById("finder")?.getBoundingClientRect?.();
        map?.setPadding?.({ left: innerWidth > 760 && finder ? Math.round(finder.right) : 0, top: 0, right: 0, bottom: 0 });
      };
      pad();
      window.addEventListener?.("resize", pad);
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
      (p) => LocationModel.isMapped(p),
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
      !LocationModel.isMapped(p)
    )
      return;
    detailCenter = [p.lng, p.lat];
    const popup = document.getElementById("detail")?.getBoundingClientRect?.();
    const offset = innerWidth > 760
      ? [-((popup?.width || 380) + 24) / 2, 0]
      : [0, -(popup?.height || 360) / 2];
    map.stop();
    map.flyTo({
      center: [p.lng, p.lat],
      zoom: p.status === "planned" ? 9 : 12,
      offset,
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 500,
    });
  }
  function clearFocus() {
    mark(null);
    const center = detailCenter;
    detailCenter = null;
    if (!map || !center) return;
    map.stop();
    map.flyTo({
      center,
      zoom: innerWidth > 760 ? 7 : 6,
      bearing: 0,
      pitch: 0,
      offset: [0, 0],
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500,
    });
  }
  function resetOverview() {
    mark(null);
    detailCenter = null;
    if (!map) return;
    map.stop();
    map.flyTo({
      ...overview(),
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
          : "mapbox://styles/mapbox/light-v11",
      );
    }
  }
  document.addEventListener("themechange", theme);
  return {
    init,
    update,
    focus,
    clearFocus,
    resetOverview,
    mark,
    bounds,
    fitAll,
    resize: () => map?.resize(),
  };
})();
