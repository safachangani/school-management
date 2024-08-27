const mysql = require('mysql2');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));  // Parses URL-encoded data
// Create a connection to the database
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Open the connection
db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database.');
});

// Endpoint to add a school
app.post('/addschool', (req, res) => {
  const { name, address, latitude, longitude } = req.body;
  if (!name || !address || !latitude || !longitude) {
    return res.status(400).send('All fields are required.');
  }

  const query = `INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)`;
  db.execute(query, [name, address, latitude, longitude], (err, results) => {
    if (err) {
      return res.status(500).send('Error inserting school data.');
    }
    res.status(201).send({ id: results.insertId });
  });
});

// Endpoint to list schools
app.get('/listschools', (req, res) => {
  const { latitude, longitude } = req.query;
  if (!latitude || !longitude) {
    return res.status(400).send('Latitude and Longitude are required.');
  }

  const userLat = parseFloat(latitude);
  const userLon = parseFloat(longitude);

  const query = `SELECT * FROM schools`;
  db.execute(query, (err, results) => {
    if (err) {
      return res.status(500).send('Error fetching schools data.');
    }

    const schools = results.map(school => {
      const distance = calculateDistance(
        userLat, userLon,
        school.latitude, school.longitude
      );
      return { ...school, distance };
    });

    // Sort schools by distance
    schools.sort((a, b) => a.distance - b.distance);

    // Send the sorted list of schools
    res.status(200).json(schools);
  });
});

// Function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = angle => angle * (Math.PI / 180);
  const R = 6371; // Radius of Earth in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
