const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

const locations = [];

// Endpoint to store a location
app.post('/store_location', (req, res) => {
    const { latitude, longitude } = req.body;
    if (latitude && longitude) {
      const location = { lat: latitude, lon: longitude };
      locations.push(location);
      io.emit('newLocation', location);
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
          #share-btn {
            margin: 10px;
            padding: 8px 16px;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <button id="share-btn">Share My Location</button>
        <div id="map"></div>
        <!-- Load Leaflet and Socket.io -->
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <script src="/socket.io/socket.io.js"></script>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            // Initialize the map centered at [0, 0] with zoom level 2
            const map = L.map('map').setView([0, 0], 2);
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
        
            // Socket.io connection for real-time updates
            const socket = io();
            socket.on('newLocation', function(location) {
              // Add a marker for each new location received
              L.marker([location.lat, location.lon]).addTo(map);
            });
        
            // Load existing locations from the server on page load
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
            loadLocations();
        
            // Use a button to trigger geolocation (required for Safari)
            document.getElementById('share-btn').addEventListener('click', function() {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  function(position) {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    console.log('User location:', lat, lon);
                    sendLocation(lat, lon);
                  },
                  function(error) {
                    console.error('Error obtaining geolocation:', error);
                  }
                );
              } else {
                console.error('Geolocation is not supported by this browser.');
              }
            });
          });
        </script>
      </body>
      </html>
    `);
  });

http.listen(port, () => {
    console.log(`Server running on port ${port}`);
});