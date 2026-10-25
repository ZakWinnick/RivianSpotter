const { test } = require("node:test");
const assert = require("node:assert/strict");
const model = require("../js/location-model.js");
const place = {
  id: 1,
  slug: "venice",
  name: "Venice",
  type: "Space",
  city: "Venice",
  state: "CA",
  status: "open",
  verificationStatus: "verified",
  timezone: "America/Los_Angeles",
  hours: "Mon-Fri: 9am-5pm, Sat-Sun: Closed",
  serviceHours: "Mon-Fri: 8am-4pm",
  address: "660 Venice Blvd",
  coordinatePrecision: "exact",
  lat: 33.99,
  lng: -118.46,
  capabilities: ["see-vehicles", "demo-drive"],
};
test("availability uses destination timezone, not visitor timezone", () => {
  assert.equal(
    model.getHoursState(place, new Date("2026-10-14T15:30:00Z")).state,
    "closed",
  );
  assert.equal(
    model.getHoursState(place, new Date("2026-10-14T17:30:00Z")).state,
    "open",
  );
  assert.equal(
    model.getHoursState(place, new Date("2026-10-14T15:30:00Z"), "service")
      .state,
    "open",
  );
});
test("unknown schedules never become open or closed claims", () => {
  for (const hours of [
    "",
    "Appointments only",
    "Call for hours",
    "Mon-Sat: maybe",
  ])
    assert.equal(
      model.getHoursState({ ...place, hours }, new Date("2026-10-14T18:00:00Z"))
        .state,
      "unknown",
    );
  assert.equal(
    model.getHoursState({ ...place, timezone: null }, new Date()).state,
    "unknown",
  );
  assert.equal(
    model.getHoursState(
      { ...place, verificationStatus: "needs-review" },
      new Date("2026-10-14T18:00:00Z"),
    ).state,
    "open",
  );
});
test("closed and planned operational states are separate from hours", () => {
  assert.equal(
    model.getHoursState({ ...place, status: "temporarily-closed" }, new Date())
      .state,
    "temporarily-closed",
  );
  assert.equal(
    model.getHoursState({ ...place, status: "planned" }, new Date()).state,
    "planned",
  );
});
test("schedule parsing supports published day ranges and separated segments", () => {
  const p = {
    ...place,
    hours:
      "Mon–Thur: 10:00am–7:00pm Fri–Sat: 10:00am–8:00pm Sun: 11:00am–7:00pm",
  };
  assert.equal(
    model.getHoursState(p, new Date("2026-10-18T17:00:00Z")).state,
    "closed",
  );
  assert.equal(
    model.getHoursState(p, new Date("2026-10-18T19:00:00Z")).state,
    "open",
  );
});
test("overnight hours carry into the next day", () => {
  const p = { ...place, hours: "Fri: 8pm-2am, Sat: Closed" };
  assert.equal(
    model.getHoursState(p, new Date("2026-10-17T08:00:00Z")).state,
    "open",
  );
  assert.equal(
    model.getHoursState(p, new Date("2026-10-17T11:00:00Z")).state,
    "closed",
  );
});
test("dated exceptions override regular hours", () => {
  const p = {
    ...place,
    hoursExceptions: [{ date: "2026-10-14", closed: true }],
  };
  assert.equal(
    model.getHoursState(p, new Date("2026-10-14T19:00:00Z")).state,
    "closed",
  );
});
test("search, intent, type, region and saved filters compose", () => {
  const b = {
    ...place,
    id: 2,
    name: "Calgary Service",
    city: "Calgary",
    state: "AB",
    type: "Demo Center",
    capabilities: ["service"],
  };
  assert.deepEqual(
    model
      .filterLocations([place, b], {
        query: "venice",
        intent: "demo-drive",
        state: "CA",
      })
      .map((x) => x.id),
    [1],
  );
  assert.deepEqual(
    model
      .filterLocations([place, b], { savedOnly: true, savedIds: [2] })
      .map((x) => x.id),
    [2],
  );
  assert.equal(
    model.filterLocations([place, b], { type: "Outpost" }).length,
    0,
  );
});
test("directions use published links or precise destinations independently of internal metadata", () => {
  assert.match(
    model.getDirectionsUrl(place),
    /^https:\/\/www.google.com\/maps\/dir\//,
  );
  assert.equal(
    model.getDirectionsUrl({ ...place, coordinatePrecision: "approximate" }),
    null,
  );
  assert.equal(
    model.getDirectionsUrl({ ...place, verificationStatus: "needs-review" }),
    model.getDirectionsUrl(place),
  );
  assert.equal(model.getDirectionsUrl({ ...place, lat: NaN }), null);
});
test("date-only values do not shift and unsafe links are rejected", () => {
  assert.equal(model.formatDate("2026-02-21"), "Feb 21, 2026");
  assert.equal(model.safeUrl("javascript:alert(1)"), null);
  assert.equal(
    model.safeUrl("https://rivian.com.evil.test/", "rivian.com"),
    null,
  );
  assert.equal(
    model.safeUrl("https://rivian.com/spaces/venice", "rivian.com"),
    "https://rivian.com/spaces/venice",
  );
  assert.equal(model.locationUrl(place), "/locations/venice/");
});
test("distance is finite and zero at same point", () => {
  assert.equal(model.distanceMiles(place, place), 0);
  assert.ok(model.distanceMiles(place, { lat: 34.05, lng: -118.24 }) > 0);
});

test("real multiline official schedules retain every day", () => {
  const p = {
    ...place,
    hours: "Mon-Fri: 10:00am-6:00pm\nSat-Sun: 10:00am-7:00pm",
  };
  assert.equal(
    model.getHoursState(p, new Date("2026-10-14T19:00:00Z")).state,
    "open",
  );
  const service = {
    ...place,
    serviceHours:
      "Mon: 8am-5pm\nTue: 8am-5pm\nWed: 8am-5pm\nThu: 8am-5pm\nFri: 8am-5pm\nSat: Closed\nSun: Closed",
  };
  assert.equal(
    model.getHoursState(service, new Date("2026-10-14T19:00:00Z"), "service")
      .state,
    "open",
  );
  assert.equal(
    model.getHoursState(
      { ...place, hours: "Sun: Closed" },
      new Date("2026-10-14T19:00:00Z"),
    ).state,
    "unknown",
  );
});
test("service coming soon does not close the general visiting hours", () => {
  const p = { ...place, serviceStatus: "planned" };
  assert.equal(
    model.getHoursState(p, new Date("2026-10-14T19:00:00Z")).state,
    "open",
  );
  assert.equal(
    model.getHoursState(p, new Date("2026-10-14T19:00:00Z"), "service").state,
    "planned",
  );
});

test('official visitor hours stay separate from restroom notes and appointment-only days', () => {
 const p = {...place, hours:'Mon-Sun: 9:00am - 5:00pm\n24-hour restroom access'};
 assert.equal(model.getHoursState(p,new Date('2026-10-14T19:00:00Z')).state,'open');
 assert.equal(model.getHoursState(p,new Date('2026-10-15T04:00:00Z')).state,'closed');
 const appointment={...place,hours:'Mon–Sat: 10:00am–6:00pm\nSun: Appointment Only'};
 assert.equal(model.getHoursState(appointment,new Date('2026-10-14T19:00:00Z')).state,'open');
 assert.equal(model.getHoursState(appointment,new Date('2026-10-18T19:00:00Z')).state,'unknown');
 assert.equal(model.getHoursState({...place,serviceHours:'Mon–Fri: 8:00am–5:00pm\nSat & Sun: Closed'},new Date('2026-10-14T19:00:00Z'),'service').state,'open');
});

test('charging and service filters evaluate their own published schedules', () => {
 const p={...place,capabilities:['charging','service'],chargingHours:'Open 24/7'};
 const late=new Date('2026-10-15T05:00:00Z');
 assert.equal(model.getHoursState(p,late,'charging').state,'open');
 assert.equal(model.filterLocations([p],{intent:'charging',openNow:true,now:late}).length,1);
 assert.equal(model.getHoursState({...p,chargingHours:null},late,'charging').state,'unknown');
 assert.equal(model.getHoursState({...p,type:'Service Center',hours:null},new Date('2026-10-14T19:00:00Z')).state,'open');
});

test('a Demo Center that offers service is labeled a Service + Demo Center', () => {
  const U = require('../js/components.js');
  assert.equal(U.locationTypeLabel({ type: 'Demo Center', capabilities: ['see-vehicles', 'service', 'demo-drive'] }), 'Service + Demo Center');
  assert.equal(U.locationTypeLabel({ type: 'Demo Center', capabilities: ['see-vehicles', 'demo-drive'] }), 'Demo Center');
  assert.equal(U.locationTypeLabel({ type: 'Service Center', capabilities: ['service'] }), 'Service Center');
  const charlotte = require('../data/locations.json').find(p => p.slug === 'charlotte-service-demo-center');
  assert.equal(U.locationTypeLabel(charlotte), 'Service + Demo Center');
});
