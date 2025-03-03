const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

const locations = [];

// Endpoint to store a location
app.post('/store_location', (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude && longitude) {
    locations.push({ lat: latitude, lon: longitude });
    res.sendStatus(200);
  } else {
    res.status(400).json({ error: 'Invalid location data' });
  }
});

// Endpoint to retrieve all locations
app.get('/locations', (req, res) => {
  res.json(locations);
});

// Serve the main page with inline HTML and client-side JS
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>User Locations Map</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
      <style>
        #map { height: 500px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          // Initialize the map centered at [0, 0] with zoom level 2
          const map = L.map('map').setView([0, 0], 2);
          
          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
      
          // Function to send the user's location to the server
          function sendLocation(lat, lon) {
            fetch('/store_location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude: lat, longitude: lon })
            })
            .then(response => {
              if (!response.ok) {
                throw new Error('Failed to store location');
              }
              console.log('Location successfully stored.');
            })
            .catch(error => console.error('Error storing location:', error));
          }
      
          // Request the user's current location
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                console.log('User location:', lat, lon);
                sendLocation(lat, lon);
              },
              (error) => console.error('Error obtaining geolocation:', error)
            );
          } else {
            console.error('Geolocation is not supported by this browser.');
          }
      
          // Function to load and display all stored locations on the map
          function loadLocations() {
            fetch('/locations')
              .then(response => response.json())
              .then(locations => {
                locations.forEach(loc => {
                  L.marker([loc.lat, loc.lon]).addTo(map);
                });
              })
              .catch(error => console.error('Error fetching locations:', error));
          }
      
          // Load locations when the page loads
          loadLocations();
        });
      </script>
    </body>
    </html>
  `);
});
app.listen(process.env.PORT || 3000);