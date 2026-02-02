const rivianLocations = [
  {
    "id": 1,
    "name": "Calgary - Service + Demo Center",
    "type": "Demo Center",
    "state": "AB",
    "lat": 51.02,
    "lng": -113.9749,
    "address": "4398 112 Ave SE",
    "city": "Calgary, AB T2C 2K2",
    "hours": "General: Mon-Sat: 9am-5pm, Sun: Closed | Service: Mon-Fri: 8am-5pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/calgary-service-demo-center"
  },
  {
    "id": 2,
    "name": "Scottsdale - Fashion Square",
    "type": "Space",
    "state": "AZ",
    "lat": 33.5018,
    "lng": -111.9293,
    "address": "15051 North Kierland Boulevard, 180F1B",
    "city": "Scottsdale, AZ 85254",
    "hours": "Mon-Sat: 10:00am-8:00pm, Sun: 11:00am-6:00pm",
    "phone": "(480) 582-1783",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/scottsdale"
  },
  {
    "id": 3,
    "name": "Tempe - Service + Demo Center",
    "type": "Demo Center",
    "state": "AZ",
    "lat": 33.3465,
    "lng": -111.9781,
    "address": "7340 South Kyrene Road Suite 111",
    "city": "Tempe, AZ 85283",
    "hours": "General: Mon-Sun: 8:00am-4:00pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/tempe-service-demo-center"
  },
  {
    "id": 4,
    "name": "Vancouver",
    "type": "Space",
    "state": "BC",
    "lat": 49.2827,
    "lng": -123.1207,
    "address": "1038 Homer St.",
    "city": "Vancouver, BC V6B 2X5",
    "hours": "Mon-Sun: 9:00am-6:00pm",
    "phone": "(604) 359-4597",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/vancouver"
  },
  {
    "id": 5,
    "name": "Burbank - Service + Demo Center",
    "type": "Demo Center",
    "state": "CA",
    "lat": 34.1808,
    "lng": -118.309,
    "address": "3120 W. Empire Ave",
    "city": "Burbank, CA 91504",
    "hours": "General: Mon-Fri: 10am-6pm, Sat-Sun: 8:30am-5pm | Service: Mon-Fri: 8am-6pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/burbank-service-demo-center"
  },
  {
    "id": 6,
    "name": "Costa Mesa - Service + Demo Center",
    "type": "Demo Center",
    "state": "CA",
    "lat": 33.6412,
    "lng": -117.9187,
    "address": "261 Briggs Ave",
    "city": "Costa Mesa, CA 92626",
    "hours": "General: Mon-Sun: 9:00am-5:00pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/costa-mesa-service-demo-center"
  },
  {
    "id": 7,
    "name": "Del Mar Highlands",
    "type": "Space",
    "state": "CA",
    "lat": 32.9517,
    "lng": -117.2365,
    "address": "3725 Paseo Place Suite 980",
    "city": "San Diego, CA 92130",
    "hours": "Mon-Sat: 10am-8pm, Sun: 11am-7pm",
    "phone": "(619) 554-8659",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/del-mar"
  },
  {
    "id": 8,
    "name": "Eastvale - Service + Demo Center",
    "type": "Demo Center",
    "state": "CA",
    "lat": 33.963,
    "lng": -117.5638,
    "address": "14940 Limonite Ave",
    "city": "Eastvale, CA 92880",
    "hours": "General: Mon-Sun: 8:30am-4:30pm | Service: Mon-Sat: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/eastvale-service-demo-center"
  },
  {
    "id": 9,
    "name": "El Segundo - Service + Demo Center",
    "type": "Demo Center",
    "state": "CA",
    "lat": 33.9192,
    "lng": -118.4165,
    "address": "401 Coral Cir",
    "city": "El Segundo, CA 90245",
    "hours": "General: Mon, Thurs-Fri: 11:00am-7:00pm, Sat-Sun: 9:00am-5:00pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/el-segundo-service-demo-center"
  },
  {
    "id": 10,
    "name": "El Segundo - Manhattan Beach",
    "type": "Space",
    "state": "CA",
    "lat": 33.8847,
    "lng": -118.4109,
    "address": "850 Pacific Coast Hwy #116",
    "city": "El Segundo, CA 90245",
    "hours": "Mon-Sun: 11am-6pm",
    "phone": "(888) 748-4261",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/el-segundo"
  },
  {
    "id": 11,
    "name": "Irvine Spectrum",
    "type": "Space",
    "state": "CA",
    "lat": 33.6495,
    "lng": -117.7408,
    "address": "638 Spectrum Center Dr",
    "city": "Irvine, CA 92618",
    "hours": "Sun-Thu: 10:00am-9:00pm, Fri-Sat: 10:00am-10:00pm",
    "phone": "(949) 535-2513",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/irvine"
  },
  {
    "id": 12,
    "name": "Joshua Tree Charging Outpost",
    "type": "Outpost",
    "state": "CA",
    "lat": 34.1347,
    "lng": -116.3131,
    "address": "61142 29 Palms Hwy",
    "city": "Joshua Tree, CA 92252",
    "hours": "Mon-Sun: 8:00am - 5:00pm, 24-hour restroom access",
    "phone": "(760) 313-0523",
    "services": [
      "Charging",
      "Restrooms",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/joshua-tree"
  },
  {
    "id": 13,
    "name": "Laguna Beach - South Coast Theater",
    "type": "Space",
    "state": "CA",
    "lat": 33.5427,
    "lng": -117.7854,
    "address": "162 South Coast Highway",
    "city": "Laguna Beach, CA 92651",
    "hours": "Mon-Sat: 10:00am-7:00pm, Sun: 10:00am-6:00pm",
    "phone": "(949) 342-8424",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/laguna-beach"
  },
  {
    "id": 14,
    "name": "Lake Forest - Service + Demo Center",
    "type": "Demo Center",
    "state": "CA",
    "lat": 33.6462,
    "lng": -117.689,
    "address": "26845 Vista Terrace",
    "city": "Lake Forest, CA 92630",
    "hours": "General: Mon-Tues: 8:30am-5:00pm, Thurs-Sun: 8:30am-5:00pm | Service: Mon-Fri: 8:00am-5:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/lake-forest-service-demo-center"
  },
  {
    "id": 15,
    "name": "Pasadena",
    "type": "Space",
    "state": "CA",
    "lat": 34.1478,
    "lng": -118.1445,
    "address": "169 W Colorado Blvd",
    "city": "Pasadena, CA 91105",
    "hours": "Mon-Sun: 10:00am-7:00pm",
    "phone": "(626) 240-1263",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/pasadena"
  },
  {
    "id": 16,
    "name": "San Diego - Service + Demo Center",
    "type": "Demo Center",
    "state": "CA",
    "lat": 32.8967,
    "lng": -117.2005,
    "address": "9530 Cabot Dr",
    "city": "San Diego, CA 92126",
    "hours": "General: Mon-Sun: 10:00am-6:00pm | Service: Tues-Sat: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/san-diego-service-demo-center"
  },
  {
    "id": 17,
    "name": "San Diego - Seaport Village",
    "type": "Space",
    "state": "CA",
    "lat": 32.709,
    "lng": -117.17,
    "address": "925 Waterfront Place Suite 189",
    "city": "San Diego, CA 92101",
    "hours": "Mon-Sun: 10am-6pm",
    "phone": "(619) 483-2661",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/san-diego"
  },
  {
    "id": 18,
    "name": "San Francisco - Hayes Valley",
    "type": "Space",
    "state": "CA",
    "lat": 37.7749,
    "lng": -122.4194,
    "address": "340 Fell Street",
    "city": "San Francisco, CA 94102",
    "hours": "Mon-Sun: 9:00am-6:00pm",
    "phone": "(650) 379-6768",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/san-francisco"
  },
  {
    "id": 19,
    "name": "San Jose - Santana Row",
    "type": "Space",
    "state": "CA",
    "lat": 37.3211,
    "lng": -121.9486,
    "address": "300 Santana Row Suite #105",
    "city": "San Jose, CA 95128",
    "hours": "Mon-Sat: 10am-9pm, Sun: 11am-7pm",
    "phone": "(408) 877-6185",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/san-jose"
  },
  {
    "id": 20,
    "name": "South San Francisco - Service + Demo Center",
    "type": "Demo Center",
    "state": "CA",
    "lat": 37.6547,
    "lng": -122.4077,
    "address": "206 Utah Ave",
    "city": "South San Francisco, CA 94080",
    "hours": "General: Mon: 10:00am-7:00pm, Tues-Sat: 8:00am-7:00pm, Sun: 8:00am-5:00pm | Service: Mon-Fri: 8:00am-5:00pm, Sat: 8:00am-2:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/south-san-francisco-service-demo-center"
  },
  {
    "id": 21,
    "name": "Van Nuys - Service + Demo Center",
    "type": "Demo Center",
    "state": "CA",
    "lat": 34.2117,
    "lng": -118.449,
    "address": "7701 Haskell Ave",
    "city": "Van Nuys, CA 91406",
    "hours": "General: Mon-Fri: 10:00am-6:00pm, Sat-Sun: 9:00am-5:00pm | Service: Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/van-nuys-service-demo-center"
  },
  {
    "id": 22,
    "name": "Venice - Abbot Kinney",
    "type": "Space",
    "state": "CA",
    "lat": 33.9879,
    "lng": -118.4721,
    "address": "660 Venice Blvd",
    "city": "Venice, CA 90291",
    "hours": "Mon-Fri: 10:00am-6:00pm, Sat-Sun: 10:00am-7:00pm",
    "phone": "(213) 293-2950",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/venice"
  },
  {
    "id": 23,
    "name": "Walnut Creek",
    "type": "Space",
    "state": "CA",
    "lat": 37.9063,
    "lng": -122.0638,
    "address": "1243 Broadway Plaza #C38",
    "city": "Walnut Creek, CA 94596",
    "hours": "Mon-Sat: 10am-8pm, Sun: 11am-6pm",
    "phone": "",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/walnut-creek"
  },
  {
    "id": 24,
    "name": "West Sacramento - Service + Demo Center",
    "type": "Demo Center",
    "state": "CA",
    "lat": 38.5816,
    "lng": -121.5301,
    "address": "1050 Triangle Ct",
    "city": "West Sacramento, CA 95605",
    "hours": "General: Tues & Sun: 8:00am-5:00pm, Wed-Sat: 8:00am-7:00pm | Service: Mon-Fri: 8:00am-5:00pm, Sat & Sun: 9:00am-3:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/west-sacramento-service-demo-center"
  },
  {
    "id": 25,
    "name": "Yosemite Charging Outpost",
    "type": "Outpost",
    "state": "CA",
    "lat": 37.7534,
    "lng": -120.2407,
    "address": "18707 Main St",
    "city": "Groveland, CA 95321",
    "hours": "Mon-Sun: 10:00am-6:00pm, 24-hour restroom access",
    "phone": "(209) 789-6928",
    "services": [
      "Charging",
      "Restrooms",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/yosemite"
  },
  {
    "id": 26,
    "name": "Colorado Springs - Service + Demo Center",
    "type": "Demo Center",
    "state": "CO",
    "lat": 38.9349,
    "lng": -104.7436,
    "address": "930 Newport Rd",
    "city": "Colorado Springs, CO 80916",
    "hours": "General: Mon-Sat: 10:00am-5:00pm | Service: Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/colorado-springs-service-demo-center"
  },
  {
    "id": 27,
    "name": "Denver - RiNo",
    "type": "Space",
    "state": "CO",
    "lat": 39.7614,
    "lng": -104.9825,
    "address": "2763 Blake St.",
    "city": "Denver, CO 80205",
    "hours": "Mon-Sat: 9am-6pm, Sun: 11am-5pm",
    "phone": "(720) 664-6674",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/denver"
  },
  {
    "id": 28,
    "name": "Miami - Service + Demo Center",
    "type": "Demo Center",
    "state": "FL",
    "lat": 25.8324,
    "lng": -80.2799,
    "address": "6955 NW 52nd St",
    "city": "Miami, FL 33166",
    "hours": "General: Mon-Sat: 9:00am-7:00pm, Sun: 9:00am-6:00pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/miami-service-demo-center"
  },
  {
    "id": 29,
    "name": "Miami - Aventura Mall",
    "type": "Space",
    "state": "FL",
    "lat": 25.9573,
    "lng": -80.1425,
    "address": "19501 Biscayne Blvd, Space 1966",
    "city": "Aventura, FL 33180",
    "hours": "Mon-Sat: 10:00am-9:30pm, Sun: 11:00am-8:00pm",
    "phone": "(786) 558-0051",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/miami-aventura"
  },
  {
    "id": 30,
    "name": "Orlando North - Service + Demo Center",
    "type": "Demo Center",
    "state": "FL",
    "lat": 28.5923,
    "lng": -81.3588,
    "address": "4000 Shader Rd",
    "city": "Orlando, FL 32808",
    "hours": "General: Mon-Wed: 10:30am-7pm, Thur-Sat: 9am-7pm, Sun: 9am-5:30pm | Service: Mon-Fri: 8am-6pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/orlando-service-demo-center"
  },
  {
    "id": 31,
    "name": "Orlando South - Service + Demo Center",
    "type": "Demo Center",
    "state": "FL",
    "lat": 28.4754,
    "lng": -81.3712,
    "address": "1026 Jetstream Dr",
    "city": "Orlando, FL 32824",
    "hours": "General: Mon-Wed: 10:30am-7:00pm, Thurs-Sat: 8:00am-7:00pm, Sun: 9:00am-5:30pm | Service: Mon-Fri: 8:00am-6:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/orlando-service-demo-center"
  },
  {
    "id": 32,
    "name": "Tampa - Service + Demo Center",
    "type": "Demo Center",
    "state": "FL",
    "lat": 27.959,
    "lng": -82.4998,
    "address": "701 N Dale Mabry Hwy",
    "city": "Tampa, FL 33609",
    "hours": "General: Wed-Sun: 9:00am-5:00pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/tampa-service-demo-center"
  },
  {
    "id": 33,
    "name": "Alpharetta - Avalon",
    "type": "Space",
    "state": "GA",
    "lat": 34.0687,
    "lng": -84.2806,
    "address": "2820 Old Milton Pkwy",
    "city": "Alpharetta, GA 30009",
    "hours": "Mon-Sat: 10:00am-8:00pm, Sun: 11:00am-7:00pm",
    "phone": "(404) 480-9442",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/alpharetta"
  },
  {
    "id": 34,
    "name": "Atlanta - Ponce City Market",
    "type": "Space",
    "state": "GA",
    "lat": 33.7721,
    "lng": -84.3657,
    "address": "675 Ponce De Leon Ave",
    "city": "Atlanta, GA 30308",
    "hours": "Mon-Sat: 10:00am-8:00pm, Sun: 11:00am-6:00pm",
    "phone": "(404) 282-5899",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/atlanta"
  },
  {
    "id": 35,
    "name": "Honolulu - Service + Demo Center",
    "type": "Demo Center",
    "state": "HI",
    "lat": 21.316,
    "lng": -157.8621,
    "address": "1603 Dillingham Blvd",
    "city": "Honolulu, HI 96817",
    "hours": "General: Mon-Sun: 8:30am-4:30pm | Service: Mon-Fri: 8:00am-6:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/honolulu-service-demo-center"
  },
  {
    "id": 36,
    "name": "Boise - Service + Demo Center",
    "type": "Demo Center",
    "state": "ID",
    "lat": 43.6187,
    "lng": -116.2146,
    "address": "740 N Five Mile Rd",
    "city": "Boise, ID 83713",
    "hours": "General: Tues-Sat: 9:00am-6:00pm | Service: Mon-Sat: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/boise-service-demo-center"
  },
  {
    "id": 37,
    "name": "Chicago - Gold Coast",
    "type": "Space",
    "state": "IL",
    "lat": 41.9017,
    "lng": -87.6281,
    "address": "871 N. Rush St.",
    "city": "Chicago, IL 60611",
    "hours": "Mon-Sat: 9:00am-7:00pm, Sun: Closed",
    "phone": "(312) 278-7319",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/chicago"
  },
  {
    "id": 38,
    "name": "Melrose Park - Service + Demo Center",
    "type": "Demo Center",
    "state": "IL",
    "lat": 41.9006,
    "lng": -87.8561,
    "address": "2050 Janice Ave",
    "city": "Melrose Park, IL 60160",
    "hours": "General: Mon-Sat: 9am-5:30pm | Service: Mon-Fri: 8am-5pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/melrose-park-service-demo-center"
  },
  {
    "id": 39,
    "name": "Skokie - Old Orchard",
    "type": "Space",
    "state": "IL",
    "lat": 42.0574,
    "lng": -87.7497,
    "address": "4999 Old Orchard, Suite M26",
    "city": "Skokie, IL 60077",
    "hours": "Mon-Sat: 10:00am-8:00pm, Sun: Closed",
    "phone": "(309) 807-5681",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/skokie"
  },
  {
    "id": 40,
    "name": "Kansas City - Service + Demo Center",
    "type": "Demo Center",
    "state": "KS",
    "lat": 38.889,
    "lng": -94.6906,
    "address": "601 N Lindenwood Dr",
    "city": "Olathe, KS 66062",
    "hours": "General: Tues-Thurs: 8:00am-4:30pm, Wed, Fri-Sat: 8:00am-5:30pm | Service: Mon-Fri: 8:00am-5:00pm, Sat: 8:00am-4:30pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/kansas-city-service-demo-center"
  },
  {
    "id": 41,
    "name": "Gaithersburg - Service + Demo Center",
    "type": "Demo Center",
    "state": "MD",
    "lat": 39.1434,
    "lng": -77.2014,
    "address": "8787 Snouffer School Road, Suite C",
    "city": "Gaithersburg, MD 20879",
    "hours": "General: Mon-Sat: 8:00am-4:30pm | Service: Mon-Sat: 8:00am-6:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/gaithersburg-service-demo-center"
  },
  {
    "id": 42,
    "name": "Glen Burnie - Service + Demo Center",
    "type": "Demo Center",
    "state": "MD",
    "lat": 39.1626,
    "lng": -76.6247,
    "address": "77 Dover Rd NE",
    "city": "Glen Burnie, MD 21060",
    "hours": "General: Mon-Sat: 8:00am-4:30pm | Service: Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/glen-burnie-service-demo-center"
  },
  {
    "id": 43,
    "name": "Boston - Back Bay",
    "type": "Space",
    "state": "MA",
    "lat": 42.3511,
    "lng": -71.0857,
    "address": "400 Newbury Street, Suite 900",
    "city": "Boston, MA 02215",
    "hours": "Mon-Sat: 10:00am-7:00pm, Sun: 11:00am-7:00pm",
    "phone": "(857) 491-0795",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/boston"
  },
  {
    "id": 44,
    "name": "Chelsea - Service + Demo Center",
    "type": "Demo Center",
    "state": "MA",
    "lat": 42.3917,
    "lng": -71.0497,
    "address": "25 Griffin Way",
    "city": "Chelsea, MA 02150",
    "hours": "General: Wed-Sun: 8:00am-7:00pm | Service: Mon-Sat: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/chelsea-service-demo-center"
  },
  {
    "id": 45,
    "name": "Caledonia - Service + Demo Center",
    "type": "Demo Center",
    "state": "MI",
    "lat": 42.7878,
    "lng": -85.5178,
    "address": "5225 68th St SE",
    "city": "Caledonia, MI 49316",
    "hours": "General: Tues-Sat: 8:00am-4:30pm | Service: Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/caledonia-service-demo-center"
  },
  {
    "id": 46,
    "name": "Madison Heights - Service + Demo Center",
    "type": "Demo Center",
    "state": "MI",
    "lat": 42.5156,
    "lng": -83.1052,
    "address": "32601 Industrial Dr",
    "city": "Madison Heights, MI 48071",
    "hours": "General: Tues-Sat: 8:00am-7:00pm | Service: Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/madison-heights-service-demo-center"
  },
  {
    "id": 47,
    "name": "St. Louis - Service + Demo Center",
    "type": "Demo Center",
    "state": "MO",
    "lat": 38.761,
    "lng": -90.3765,
    "address": "6120 N Lindbergh Blvd",
    "city": "Hazelwood, MO 63042",
    "hours": "General: Tues & Thurs: 8:00am-5:30pm, Wed, Fri-Sat: 8:00am-5:30pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/st-louis-service-demo-center"
  },
  {
    "id": 48,
    "name": "North Las Vegas - Service + Demo Center",
    "type": "Demo Center",
    "state": "NV",
    "lat": 36.2657,
    "lng": -115.1768,
    "address": "1914 Mendenhall Dr",
    "city": "North Las Vegas, NV 89081",
    "hours": "General: Tues-Sat: 8:00am-5:00pm | Service: Mon-Fri: 8:00am-5:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/north-las-vegas-service-demo-center"
  },
  {
    "id": 49,
    "name": "Sparks - Service + Demo Center",
    "type": "Demo Center",
    "state": "NV",
    "lat": 39.5342,
    "lng": -119.7511,
    "address": "1315 Greg St",
    "city": "Sparks, NV 89431",
    "hours": "General: Tues-Sat: 9:00am-5:00pm | Service: Mon-Fri: 8:00am-5:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/sparks-service-demo-center"
  },
  {
    "id": 50,
    "name": "Woodbridge - Service + Demo Center",
    "type": "Demo Center",
    "state": "NJ",
    "lat": 40.5576,
    "lng": -74.2846,
    "address": "931 US-1",
    "city": "Iselin, NJ 08830",
    "hours": "General: Wed-Thurs: 8am-4:30pm, Fri-Sun: 9am-5:30pm | Service: Mon-Fri: 8am-5pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/woodbridge-service-demo-center"
  },
  {
    "id": 51,
    "name": "Blauvelt - Service + Demo Center",
    "type": "Demo Center",
    "state": "NY",
    "lat": 41.0645,
    "lng": -73.9546,
    "address": "800 Bradley Hill Rd",
    "city": "Blauvelt, NY 10913",
    "hours": "General: Wed-Sun: 8:00am-7:00pm | Service: Mon-Tues: 8:00am-5:00pm, Wed-Fri: 8:00am-7:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/blauvelt-service-demo-center"
  },
  {
    "id": 52,
    "name": "Brooklyn - Williamsburg",
    "type": "Space",
    "state": "NY",
    "lat": 40.7183,
    "lng": -73.9614,
    "address": "366 Wythe Ave",
    "city": "Brooklyn, NY 11249",
    "hours": "Mon-Sun: 10:00am-7:00pm",
    "phone": "(718) 233-4382",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/brooklyn"
  },
  {
    "id": 53,
    "name": "New York - Meatpacking District",
    "type": "Space",
    "state": "NY",
    "lat": 40.7412,
    "lng": -74.0082,
    "address": "461 W 14th Street",
    "city": "New York, NY 10014",
    "hours": "Mon-Sun: 10am-7pm",
    "phone": "(646) 453-4613",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/new-york"
  },
  {
    "id": 54,
    "name": "Roslyn",
    "type": "Space",
    "state": "NY",
    "lat": 40.7998,
    "lng": -73.6485,
    "address": "1073 Northern Blvd",
    "city": "Roslyn, NY 11576",
    "hours": "Mon-Sat: 10am-7pm, Sun: 12pm-6pm",
    "phone": "(516) 231-2048",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/roslyn"
  },
  {
    "id": 55,
    "name": "White Plains - The Westchester",
    "type": "Space",
    "state": "NY",
    "lat": 41.0315,
    "lng": -73.7585,
    "address": "125 Westchester Ave",
    "city": "White Plains, NY 10601",
    "hours": "Mon-Thurs: 10:00am-8:00pm, Fri-Sat: 10:00am-9:00pm, Sun: 12:00pm-6:00pm",
    "phone": "(914) 227-2330",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/white-plains"
  },
  {
    "id": 56,
    "name": "Toronto - Service + Demo Center",
    "type": "Demo Center",
    "state": "ON",
    "lat": 43.773,
    "lng": -79.5373,
    "address": "8311 Weston Rd",
    "city": "Vaughan, ON L4L 9N7",
    "hours": "General: Mon-Sat: 9:00am-7:00pm, Sun: 10:00am-6:00pm | Service: Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/toronto-service-demo-center"
  },
  {
    "id": 57,
    "name": "Portland - Service + Demo Center",
    "type": "Demo Center",
    "state": "OR",
    "lat": 45.5004,
    "lng": -122.6749,
    "address": "2620 SW 1st Ave",
    "city": "Portland, OR 97201",
    "hours": "General: Mon-Sun: 9:00am-6:00pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/portland-service-demo-center"
  },
  {
    "id": 58,
    "name": "Tigard - Washington Square",
    "type": "Space",
    "state": "OR",
    "lat": 45.4502,
    "lng": -122.7817,
    "address": "7393 SW Bridgeport Rd",
    "city": "Tigard, OR 97224",
    "hours": "Mon-Sat: 10:00am-8:00pm, Sun: 11:00am-6:00pm",
    "phone": "(503) 894-7284",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/tigard"
  },
  {
    "id": 59,
    "name": "Montreal - Service + Demo Center",
    "type": "Demo Center",
    "state": "QC",
    "lat": 45.527,
    "lng": -73.6518,
    "address": "5720 Rue Ferrier",
    "city": "Mont Royal, QC H4P 1M7",
    "hours": "General: Mon-Sat: 9am-5pm | Service: Mon-Fri: 8am-4:30pm, Sat: Appointments only",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/montreal-service-demo-center"
  },
  {
    "id": 60,
    "name": "Franklin - Service + Demo Center",
    "type": "Demo Center",
    "state": "TN",
    "lat": 35.9251,
    "lng": -86.8689,
    "address": "305 5th Ave N",
    "city": "Franklin, TN 37064",
    "hours": "General: Tues-Sat: 8:00am-4:30pm | Service: Mon: 8:00am-6:00pm, Tues-Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/franklin-service-demo-center"
  },
  {
    "id": 61,
    "name": "Memphis - Service + Demo Center",
    "type": "Demo Center",
    "state": "TN",
    "lat": 35.21,
    "lng": -89.8036,
    "address": "6936 Appling Farms Pkwy",
    "city": "Memphis, TN 38133",
    "hours": "General: Wed-Sat: 8:00am-6:00pm, Tues & Sun: 8:00am-4:00pm | Service: Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/memphis-service-demo-center"
  },
  {
    "id": 62,
    "name": "Nashville - The Gulch",
    "type": "Space",
    "state": "TN",
    "lat": 36.1527,
    "lng": -86.7958,
    "address": "905 Gleaves St.",
    "city": "Nashville, TN 37203",
    "hours": "Mon-Sat: 10:00am-7:00pm, Sun: 11:00am-7:00pm",
    "phone": "(615) 649-7855",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/nashville"
  },
  {
    "id": 63,
    "name": "Austin - South Congress",
    "type": "Space",
    "state": "TX",
    "lat": 30.2507,
    "lng": -97.7495,
    "address": "208 S Congress Ave",
    "city": "Austin, TX 78704",
    "hours": "Sun-Thu: 10:00am-7:00pm, Fri-Sat: 10:00am-8:00pm",
    "phone": "(512) 387-7760",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/austin"
  },
  {
    "id": 64,
    "name": "Austin - Service + Demo Center",
    "type": "Demo Center",
    "state": "TX",
    "lat": 30.3165,
    "lng": -97.6967,
    "address": "622 Morrow St",
    "city": "Austin, TX 78752",
    "hours": "General: Tues-Sat: 9:00am-5:00pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/austin-service-demo-center"
  },
  {
    "id": 65,
    "name": "Dallas - Knox Street",
    "type": "Space",
    "state": "TX",
    "lat": 32.8252,
    "lng": -96.7889,
    "address": "3010 Knox St",
    "city": "Dallas, TX 75205",
    "hours": "Mon-Sat: 10:00am-7:00pm, Sun: 10:00am-6:00pm",
    "phone": "(972) 499-5051",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/dallas"
  },
  {
    "id": 66,
    "name": "Dallas - Service + Demo Center",
    "type": "Demo Center",
    "state": "TX",
    "lat": 32.735,
    "lng": -96.8669,
    "address": "2512 Hawes Ave",
    "city": "Dallas, TX 75235",
    "hours": "General: Mon-Sat: 10:00am-5:00pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 9:00am-2:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/dallas-service-demo-center"
  },
  {
    "id": 67,
    "name": "Houston - Service + Demo Center",
    "type": "Demo Center",
    "state": "TX",
    "lat": 30.0305,
    "lng": -95.4363,
    "address": "20221 Carriage Point Dr",
    "city": "Houston, TX 77073",
    "hours": "General: Tues-Sat: 11:00am-7:00pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/houston-service-demo-center"
  },
  {
    "id": 68,
    "name": "San Antonio - Service + Demo Center",
    "type": "Demo Center",
    "state": "TX",
    "lat": 29.5081,
    "lng": -98.4437,
    "address": "8790 Crownhill Blvd",
    "city": "San Antonio, TX 78209",
    "hours": "General: Tues-Sat: 10:00am-6:30pm | Service: Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/san-antonio-service-demo-center"
  },
  {
    "id": 69,
    "name": "Salt Lake City - Service + Demo Center",
    "type": "Demo Center",
    "state": "UT",
    "lat": 40.7397,
    "lng": -111.92,
    "address": "1830 Redwood Depot Ln Building F Suite 9",
    "city": "Salt Lake City, UT 84104",
    "hours": "General: Mon-Sun: 8:00am-6:00pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/salt-lake-city-service-demo-center"
  },
  {
    "id": 70,
    "name": "Richmond - Service + Demo Center",
    "type": "Demo Center",
    "state": "VA",
    "lat": 37.5758,
    "lng": -77.5099,
    "address": "2289 Dabney Rd",
    "city": "Richmond, VA 23230",
    "hours": "General: Tues & Sun: 8:00am-4:30pm, Wed-Sat: 8:00am-7:00pm | Service: Mon-Fri: 8:00am-6:00pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/richmond-service-demo-center"
  },
  {
    "id": 71,
    "name": "Bellevue - Education Center",
    "type": "Demo Center",
    "state": "WA",
    "lat": 47.6101,
    "lng": -122.2015,
    "address": "620 116th Ave NE",
    "city": "Bellevue, WA 98004",
    "hours": "General: Wed-Sun: 10:00am-6:00pm | Service: Mon-Fri: 8:00am-5:30pm, Sat: 9:00am-4:00pm",
    "phone": "",
    "services": [
      "Education",
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/bellevue-service-demo-center"
  },
  {
    "id": 72,
    "name": "Fife",
    "type": "Space",
    "state": "WA",
    "lat": 47.2402,
    "lng": -122.3574,
    "address": "1323 34th Ave E",
    "city": "Fife, WA 98424",
    "hours": "General: Wed-Sun: 10am-6pm | Service: Mon-Fri: 8am-5pm",
    "phone": "",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/fife-service-demo-center"
  },
  {
    "id": 73,
    "name": "Seattle - University Village",
    "type": "Space",
    "state": "WA",
    "lat": 47.6615,
    "lng": -122.2985,
    "address": "2617 NE 46th Street",
    "city": "Seattle, WA 98105",
    "hours": "Mon-Sat: 10am-8pm, Sun: 11am-6pm",
    "phone": "(206) 249-9056",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/seattle"
  },
  {
    "id": 74,
    "name": "Menomonee Falls - Service + Demo Center",
    "type": "Demo Center",
    "state": "WI",
    "lat": 43.179,
    "lng": -88.1171,
    "address": "N59 W13500 Manhardt Drive, Suite 100",
    "city": "Menomonee Falls, WI 53051",
    "hours": "General: Tues-Sat: 8:00am-4:30pm | Service: Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/menomonee-falls-service-demo-center"
  },
  {
    "id": 75,
    "name": "The Hamptons, NY Charging Outpost",
    "type": "Outpost",
    "lat": 40.8987,
    "lng": -72.3726,
    "address": "1 Montauk Highway",
    "city": "Southampton, NY 11968",
    "state": "NY",
    "hours": "Mon-Sun: 9a-5p, 24-hour Restroom Access",
    "phone": "",
    "services": [
      "Charging",
      "Test Drives",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/hamptons"
  },
  {
    "id": 76,
    "name": "Miami, FL Brickell",
    "type": "Space",
    "lat": 25.7653,
    "lng": -80.1939,
    "address": "900 S Miami Ave Ste. 152",
    "city": "Miami FL 33130",
    "state": "FL",
    "hours": "Mon-Sat: 10a-9p, Sun: 11a-6p",
    "phone": "",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/miami-brickell"
  },
  {
    "id": 77,
    "name": "Brea Mall",
    "type": "Space",
    "state": "CA",
    "lat": 33.9168,
    "lng": -117.8854,
    "address": "1230 Brea Mall",
    "city": "Brea, CA 92821",
    "hours": "Mon-Thur: 10am-8pm, Fri-Sat: 10am-9pm, Sun: 11am-7pm",
    "phone": "(657) 208-8472",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/brea"
  },
  {
    "id": 78,
    "name": "The Grove",
    "type": "Space",
    "state": "CA",
    "lat": 34.0726,
    "lng": -118.3578,
    "address": "189 The Grove Drive",
    "city": "Los Angeles, CA 90036",
    "hours": "Mon-Tue: Closed, Wed-Sun: 11am-7pm",
    "phone": "",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/los-angeles"
  },
  {
    "id": 79,
    "name": "Stanford Shopping Center",
    "type": "Space",
    "state": "CA",
    "lat": 37.4425,
    "lng": -122.1707,
    "address": "180 El Camino Real, Suite 450B",
    "city": "Palo Alto, CA 94304",
    "hours": "Mon-Sat: 10am-8pm, Sun: 11am-7pm",
    "phone": "",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/palo-alto"
  },
  {
    "id": 80,
    "name": "Fort Myers - Service + Demo Center",
    "type": "Demo Center",
    "state": "FL",
    "lat": 26.5945,
    "lng": -81.8011,
    "address": "9987 Gulf Logistics Drive, Suite 401",
    "city": "Fort Myers, FL 33913",
    "hours": "General: Mon-Wed: 11:30am-7pm, Thurs-Sat: 9am-7pm, Sun: 9:30am-5:30pm | Service: Mon-Fri: 8am-8pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/fort-myers-service-demo-center"
  },
  {
    "id": 81,
    "name": "Buffalo Grove - Service + Demo Center",
    "type": "Demo Center",
    "state": "IL",
    "lat": 42.1731,
    "lng": -87.9496,
    "address": "909 Asbury Dr",
    "city": "Buffalo Grove, IL 60089",
    "hours": "General: Mon-Sat: 9am-6pm | Service: Mon-Fri: 8am-5pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/buffalo-grove-service-demo-center"
  },
  {
    "id": 82,
    "name": "Belgrade - Service + Demo Center",
    "type": "Demo Center",
    "lat": 45.7749,
    "lng": -111.1768,
    "address": "617 Alaska Frontage Rd",
    "city": "Belgrade, MT 59714",
    "state": "MT",
    "hours": "General: Mon-Sun: 9am-6pm | Service: Mon-Fri: 8am-5pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/belgrade-service-demo-center"
  },
  {
    "id": 83,
    "name": "Ladson - Service + Demo Center",
    "type": "Demo Center",
    "state": "SC",
    "lat": 33.0094,
    "lng": -80.1283,
    "address": "186 Acres Dr",
    "city": "Ladson, SC 29456",
    "hours": "General: Mon-Sun: 9:00am-5:00pm | Service: Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/ladson-service-demo-center"
  },
  {
    "id": 84,
    "name": "Tysons Corner",
    "type": "Space",
    "state": "VA",
    "lat": 38.9266,
    "lng": -77.2241,
    "address": "1961 Chain Bridge Rd",
    "city": "McLean, VA 22101",
    "hours": "Mon-Sat: 10am-9pm, Sun: 11am-7pm",
    "phone": "",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/mclean"
  },
  {
    "id": 85,
    "name": "Bothell - Education Center",
    "type": "Demo Center",
    "state": "WA",
    "lat": 47.8354,
    "lng": -122.2033,
    "address": "18728 Bothell Everett Hwy, Building C",
    "city": "Bothell, WA 98012",
    "hours": "General: Wed-Sun: 11:00am-6:00pm",
    "phone": "",
    "services": [
      "Education"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/bothell-service-demo-center"
  },
  {
    "id": 86,
    "name": "Seattle - Education Center",
    "type": "Demo Center",
    "state": "WA",
    "lat": 47.6613,
    "lng": -122.2889,
    "address": "2617 NE 46th Street",
    "city": "Seattle, WA 98105",
    "hours": "Mon-Sat: 10am-8pm, Sun: 10am-6pm",
    "phone": "",
    "services": [
      "Education"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/seattle"
  },
  {
    "id": 87,
    "name": "Phoenix - Service Center",
    "type": "Service Center",
    "state": "AZ",
    "lat": 33.4484,
    "lng": -112.0773,
    "address": "Phoenix, AZ",
    "city": "Phoenix, AZ",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 88,
    "name": "Fresno - Service Center",
    "type": "Service Center",
    "state": "CA",
    "lat": 36.7378,
    "lng": -119.7871,
    "address": "Fresno, CA",
    "city": "Fresno, CA",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 89,
    "name": "Hayward - Service Center",
    "type": "Service Center",
    "state": "CA",
    "lat": 37.6688,
    "lng": -122.0808,
    "address": "Hayward, CA",
    "city": "Hayward, CA",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 90,
    "name": "La Jolla - UTC",
    "type": "Space",
    "state": "CA",
    "lat": 32.8696,
    "lng": -117.2106,
    "address": "4353 La Jolla Village Dr., Suite H21",
    "city": "San Diego, CA 92122",
    "hours": "Mon-Sat: 10am-8pm, Sun: 11am-7pm",
    "phone": "(858) 333-5437",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/la-jolla"
  },
  {
    "id": 91,
    "name": "Milpitas - Service + Demo Center",
    "type": "Demo Center",
    "state": "CA",
    "lat": 37.4323,
    "lng": -121.8996,
    "address": "755 Yosemite Dr",
    "city": "Milpitas, CA 95035",
    "hours": "General: Mon-Sun: 10am-6pm | Service: Mon-Fri: 8am-6pm, Sat: 9am-4pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/milpitas-service-demo-center"
  },
  {
    "id": 92,
    "name": "Rohnert Park - Service Center",
    "type": "Service Center",
    "state": "CA",
    "lat": 38.3396,
    "lng": -122.7011,
    "address": "Rohnert Park, CA",
    "city": "Rohnert Park, CA",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 93,
    "name": "Sunnyvale - Service Center",
    "type": "Service Center",
    "state": "CA",
    "lat": 37.3688,
    "lng": -122.0363,
    "address": "Sunnyvale, CA",
    "city": "Sunnyvale, CA",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 94,
    "name": "Shelton - Service Center",
    "type": "Service Center",
    "state": "CT",
    "lat": 41.3165,
    "lng": -73.0931,
    "address": "Shelton, CT",
    "city": "Shelton, CT",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 95,
    "name": "Roswell - Service Center",
    "type": "Service Center",
    "state": "GA",
    "lat": 34.0234,
    "lng": -84.3616,
    "address": "Roswell, GA",
    "city": "Roswell, GA",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 96,
    "name": "Normal - Service Center",
    "type": "Service Center",
    "state": "IL",
    "lat": 40.5142,
    "lng": -88.9906,
    "address": "Normal, IL",
    "city": "Normal, IL",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 97,
    "name": "Chicago - Service Center",
    "type": "Service Center",
    "state": "IL",
    "lat": 41.8781,
    "lng": -87.6298,
    "address": "Chicago, IL",
    "city": "Chicago, IL",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 98,
    "name": "Fort Wayne - Service Center",
    "type": "Service Center",
    "state": "IN",
    "lat": 41.0793,
    "lng": -85.1394,
    "address": "Fort Wayne, IN",
    "city": "Fort Wayne, IN",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 99,
    "name": "Council Bluffs - Service Center",
    "type": "Service Center",
    "state": "IA",
    "lat": 41.2619,
    "lng": -95.8608,
    "address": "Council Bluffs, IA",
    "city": "Council Bluffs, IA",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 100,
    "name": "Shepherdsville - Service Center",
    "type": "Service Center",
    "state": "KY",
    "lat": 37.9884,
    "lng": -85.7158,
    "address": "Shepherdsville, KY",
    "city": "Shepherdsville, KY",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 101,
    "name": "Minneapolis - Service Center",
    "type": "Service Center",
    "state": "MN",
    "lat": 44.9778,
    "lng": -93.265,
    "address": "Minneapolis, MN",
    "city": "Minneapolis, MN",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 102,
    "name": "Canton - Service Center",
    "type": "Service Center",
    "state": "MA",
    "lat": 42.1584,
    "lng": -71.1448,
    "address": "Canton, MA",
    "city": "Canton, MA",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 103,
    "name": "Hudson - Service Center",
    "type": "Service Center",
    "state": "NH",
    "lat": 42.7653,
    "lng": -71.4398,
    "address": "Hudson, NH",
    "city": "Hudson, NH",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 104,
    "name": "Trenton - Service Center",
    "type": "Service Center",
    "state": "NJ",
    "lat": 40.2171,
    "lng": -74.7429,
    "address": "Trenton, NJ",
    "city": "Trenton, NJ",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 105,
    "name": "East Syracuse - Service Center",
    "type": "Service Center",
    "state": "NY",
    "lat": 43.0651,
    "lng": -76.0781,
    "address": "East Syracuse, NY",
    "city": "East Syracuse, NY",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 106,
    "name": "West Henrietta - Service Center",
    "type": "Service Center",
    "state": "NY",
    "lat": 43.0653,
    "lng": -77.6629,
    "address": "West Henrietta, NY",
    "city": "West Henrietta, NY",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 107,
    "name": "Queens - Service Center",
    "type": "Service Center",
    "state": "NY",
    "lat": 40.7282,
    "lng": -73.7949,
    "address": "Queens, NY",
    "city": "Queens, NY",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 108,
    "name": "Woodbury - Service Center",
    "type": "Service Center",
    "state": "NY",
    "lat": 40.8176,
    "lng": -73.4707,
    "address": "Woodbury, NY",
    "city": "Woodbury, NY",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 109,
    "name": "Knightdale - Service Center",
    "type": "Service Center",
    "state": "NC",
    "lat": 35.7879,
    "lng": -78.4897,
    "address": "Knightdale, NC",
    "city": "Knightdale, NC",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 110,
    "name": "Cleveland - Service Center",
    "type": "Service Center",
    "state": "OH",
    "lat": 41.4993,
    "lng": -81.6944,
    "address": "Cleveland, OH",
    "city": "Cleveland, OH",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 111,
    "name": "Groveport - Service Center",
    "type": "Service Center",
    "state": "OH",
    "lat": 39.8481,
    "lng": -82.8835,
    "address": "Groveport, OH",
    "city": "Groveport, OH",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 112,
    "name": "Sharonville - Service Center",
    "type": "Service Center",
    "state": "OH",
    "lat": 39.2681,
    "lng": -84.4133,
    "address": "Sharonville, OH",
    "city": "Sharonville, OH",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 113,
    "name": "Oklahoma City - Service Center",
    "type": "Service Center",
    "state": "OK",
    "lat": 35.4676,
    "lng": -97.5164,
    "address": "Oklahoma City, OK",
    "city": "Oklahoma City, OK",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 114,
    "name": "Tualatin - Service Center",
    "type": "Service Center",
    "state": "OR",
    "lat": 45.384,
    "lng": -122.7636,
    "address": "Tualatin, OR",
    "city": "Tualatin, OR",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 115,
    "name": "Malvern - Service Center",
    "type": "Service Center",
    "state": "PA",
    "lat": 40.0362,
    "lng": -75.5138,
    "address": "Malvern, PA",
    "city": "Malvern, PA",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 116,
    "name": "Duncan - Service Center",
    "type": "Service Center",
    "state": "SC",
    "lat": 34.9376,
    "lng": -82.1437,
    "address": "Duncan, SC",
    "city": "Duncan, SC",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 117,
    "name": "Fort Worth - Service Center",
    "type": "Service Center",
    "state": "TX",
    "lat": 32.7555,
    "lng": -97.3308,
    "address": "Fort Worth, TX",
    "city": "Fort Worth, TX",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 118,
    "name": "Katy - Service Center",
    "type": "Service Center",
    "state": "TX",
    "lat": 29.7858,
    "lng": -95.8245,
    "address": "Katy, TX",
    "city": "Katy, TX",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 119,
    "name": "Sterling - Service Center",
    "type": "Service Center",
    "state": "VA",
    "lat": 39.0062,
    "lng": -77.4286,
    "address": "Sterling, VA",
    "city": "Sterling, VA",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 120,
    "name": "Richmond - Service Center",
    "type": "Service Center",
    "state": "BC",
    "lat": 49.166,
    "lng": -123.1336,
    "address": "Richmond, BC",
    "city": "Richmond, BC",
    "hours": "Mon-Fri: 8:00am-5:00pm",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": ""
  },
  {
    "id": 121,
    "name": "San Jose - Service + Demo Center",
    "type": "Demo Center",
    "state": "CA",
    "lat": 37.3689,
    "lng": -121.8575,
    "address": "660 N King Rd",
    "city": "San Jose, CA 95133",
    "hours": "General: Tue: 10am-7pm, Wed-Sat: 8am-7pm, Sun: 8am-4pm, Mon: Closed | Service: Mon-Fri: 8am-6pm",
    "phone": "",
    "services": [
      "Demo Drive",
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true,
    "rivianUrl": "https://rivian.com/spaces/san-jose-service-demo-center"
  },
  {
    "id": 122,
    "name": "King of Prussia",
    "type": "Space",
    "state": "PA",
    "lat": 40.0879,
    "lng": -75.3903,
    "address": "160 N Gulph Road",
    "city": "King of Prussia, PA 19406",
    "hours": "Mon-Thurs: 10am-8pm, Fri-Sat: 10am-9pm, Sun: 11am-6pm",
    "phone": "(484) 808-4776",
    "services": [
      "Test Drives",
      "Vehicle Tours",
      "Merchandise"
    ],
    "isOpen": false,
    "openingDate": "2026-02-21",
    "rivianUrl": "https://rivian.com/spaces/king-of-prussia"
  },
  {
    "id": 123,
    "name": "Long Island City - Service Center",
    "type": "Service Center",
    "state": "NY",
    "lat": 40.7563,
    "lng": -73.9409,
    "address": "38-50 21st St.",
    "city": "Long Island City, NY 11101",
    "hours": "Mon-Fri: 8AM-5PM",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true
  },
  {
    "id": 124,
    "name": "Martinez - Service Center",
    "type": "Service Center",
    "state": "CA",
    "lat": 37.9955,
    "lng": -122.0749,
    "address": "5036 Blum Rd",
    "city": "Martinez, CA 94553",
    "hours": "Mon-Sun: 8AM-5PM",
    "phone": "",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true
  },
  {
    "id": 125,
    "name": "Niagara Falls - Service Center",
    "type": "Service Center",
    "state": "NY",
    "lat": 43.1039,
    "lng": -78.9999,
    "address": "",
    "city": "Niagara Falls, NY",
    "hours": "",
    "phone": "1-888-RIVIAN1",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true
  },
  {
    "id": 126,
    "name": "Stallings - Service Center",
    "type": "Service Center",
    "state": "NC",
    "lat": 35.0922,
    "lng": -80.6895,
    "address": "",
    "city": "Stallings, NC",
    "hours": "",
    "phone": "1-888-RIVIAN1",
    "services": [
      "Service",
      "Repairs",
      "Parts"
    ],
    "isOpen": true
  }
];
if (typeof module !== 'undefined' && module.exports) {
    module.exports = rivianLocations;
}