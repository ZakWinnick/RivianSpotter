const rivianLocations = [
  {
    "id": 1,
    "name": "Laguna Beach",
    "type": "Space",
    "lat": 33.5426,
    "lng": -117.7845,
    "address": "162 South Coast Highway",
    "city": "Laguna Beach, CA 92651",
    "state": "CA",
    "hours": "Mon-Sat: 10am-7pm, Sun: 10am-6pm",
    "phone": "(949) 342-8424",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true
  },
  {
    "id": 1756748957598,
    "name": "Yosemite",
    "type": "Outpost",
    "lat": 37.8386,
    "lng": -120.2309,
    "address": "18707 Main Street",
    "city": "Groveland, CA 95321",
    "state": "CA",
    "hours": "Mon-Sun: 10a-6p, 24-hour Restroom Access",
    "phone": "(209) 789-6928",
    "services": [
      "Charging",
      "Driver's Lounge",
      "Restrooms",
      "Merchandise"
    ],
    "isOpen": true
  },
  {
    "id": 1756749241687,
    "name": "West Sacramento Service + Demo Center",
    "type": "Space",
    "lat": 38.5881,
    "lng": -121.5298,
    "address": "1050 Triangle Court",
    "city": "West Sacramento, CA 95605",
    "state": "CA",
    "hours": "Mon: Closed, Tues & Sun: 8:00a-5:00p, Wed-Sat: 8:00a-7:00p",
    "phone": "",
    "services": [
      "Test Drives",
      "Service"
    ],
    "isOpen": true
  }
];
if (typeof module !== 'undefined' && module.exports) {
    module.exports = rivianLocations;
}
