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
          <!-- Viewport meta tag for mobile responsiveness -->
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>User Locations Map</title>
          <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
          <style>
            /* Basic reset and font settings */
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              font-family: Arial, sans-serif;
            }
            /* Header styling */
            #header {
              background: #f8f8f8;
              padding: 10px;
              text-align: center;
              border-bottom: 1px solid #ccc;
            }
            /* Button styling */
            #share-btn {
              padding: 10px 20px;
              font-size: 16px;
              border: none;
              background-color: #007bff;
              color: white;
              border-radius: 4px;
              cursor: pointer;
            }
            #share-btn:active {
              background-color: #0056b3;
            }
            /* Map container fills remaining height */
            #map {
              height: calc(100% - 60px); /* Adjust based on header height */
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div id="header">
            <button id="share-btn">Share My Location</button>
          </div>
          <div id="map"></div>
          <!-- Load Leaflet and Socket.io -->
          <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
          <script src="/socket.io/socket.io.js"></script>
          <script>
            document.addEventListener('DOMContentLoaded', function() {
              // Initialize the Leaflet map centered at [0, 0] with zoom level 2
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
                  if (!response.ok) throw new Error('Failed to store location');
                  console.log('Location successfully stored.');
                })
                .catch(error => console.error('Error storing location:', error));
              }
        
              // Establish Socket.io connection for real-time updates
              const socket = io();
              socket.on('newLocation', function(location) {
                L.marker([location.lat, location.lon]).addTo(map);
              });
        
              // Load existing locations on page load
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
        
              // Button click triggers geolocation (needed for mobile/Safari)
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