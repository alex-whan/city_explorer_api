'use strict';

// Global Error messages
// 500 error message
const errorMessage_500 = 'Sorry, something went wrong.';
// 404 error message 
const errorMessage_404 = 'Sorry, this route does not exist.';

// Set up Express server and initialize Express into variable
const express = require('express');
const app = express();

// Set up cors
const cors = require('cors');
app.use(cors());

// Set up and configure dotenv
require('dotenv').config();

// Set up superagent
const superagent = require('superagent');

// Set up pg and database to connect to Postgres
const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => console.error(err));

// Bring in the PORT by using process.env.variable name
const PORT = process.env.PORT || 3001;

// Location route
app.get('/location', locationHandler);

// Restaurant route
app.get('/restaurants', restaurantHandler);

// Trails route
app.get('/trails', trailsHandler);

// "Use" will handle any GET, POST, UPDATE, DELETE requests
app.use('*', handleNotFound);

// Location handler
function locationHandler(request, response){
  let city = request.query.city;
  let url = 'https://us1.locationiq.com/v1/search.php';

  const queryParams = {
    key: process.env.GEOCODE_API_KEY,
    q: city,
    format: 'json',
    limit: 1
  }

  let sqlQuery = 'SELECT * FROM location WHERE search_query = $1;';
  let safeValue = [city];

  client.query(sqlQuery, safeValue)
    .then(sqlResults => {
      if (sqlResults.rowCount){ // checks if we get a row count back
        console.log('Getting info from the DATABASE');
        response.status(200).send(sqlResults.rows[0]);

      } else {
        superagent.get(url)
          .query(queryParams) // superagent feature
          .then(data => {
              const geoData = data.body[0];
              const finalLoc = new Location(city, geoData);

              let sqlQuery = 'INSERT INTO location (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4);';
              let safeValues = [city, finalLoc.formatted_query, finalLoc.latitude, finalLoc.longitude];

              client.query(sqlQuery, safeValues);

              response.status(200).send(finalLoc);
            }).catch()
      }}
)};



    


// // GET LOCATION DATA
// // Use the "app" variable and .get() method to get/return data along the '/location' route and run it through the constructor function to normalize it
// app.get('/location', (request, response) => {
//     let city = request.query.city;
//     //console.log(city);
//     let url = `https://us1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json`;

//     // See if location already exists in DB
//     let sqlQuery = 'SELECT * FROM location WHERE search_query = $1;';
//     let safeValue = [city];

//     client.query(sqlQuery, safeValue)
//       .then(sqlResults => {
//         //console.log(sqlResults);
//         if (sqlResults.rowCount){   // checks if we get a row count back = true
//           console.log('Getting info from the DATABASE');
//           response.status(200).send(sqlResults.rows[0]);
//         } else {
//           superagent.get(url)
//             .then(resultsFromSuperAgent => {
//               console.log('Getting info from the API');
//               let finalObj = new Location(city, resultsFromSuperAgent.body[0]);
//               let sqlQuery = 'INSERT INTO location (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4);';
//               let safeValues = [city, finalObj.formatted_query, finalObj.latitude, finalObj.longitude];
//               client.query(sqlQuery, safeValues);
//               response.status(200).send(finalObj);
//             })
//           }
//         }).catch(err => console.error(err));
//   });

// GET WEATHER DATA
// Use the "app" variable and .get() method to get/return data along the '/location' route and run it through the constructor function to normalize it - using a forEach loop
app.get('/weather', (request, response) => {
  try{
    let search_query = request.query.search_query;

    let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${search_query}&key=${process.env.WEATHER_API_KEY}&days=8`;

    superagent.get(url)
      .then(resultsFromSuperAgent => {
        let weatherArray = resultsFromSuperAgent.body.data.map(day => new Weather(day));
        response.status(200).send(weatherArray);
      }).catch(err => console.log(err));
  } catch(err){
    response.status(500).send(errorMessage_500);
  }
})

// GET TRAILS DATA
app.get('/trails', (request, response) => {
  try{
    let latitude = request.query.latitude;
    let longitude = request.query.longitude;

    let url = `https://www.hikingproject.com/data/get-trails?lat=${latitude}&lon=${longitude}&key=${process.env.TRAIL_API_KEY}`;

    superagent.get(url)
      .then(resultsFromSuperAgent => {
        let trailArray = resultsFromSuperAgent.body.trails.map(hike => {return new Trail(hike)
        });
        response.status(200).send(trailArray);
      }).catch(err => console.log(err));
  } catch(err){
      response.status(500).send(errorMessage_500);
  }
})

// 404 handler function
function handleNotFound(request, response){
  response.status(404).send('Sorry, this route does not exist.');
}



// Constructor function to normalize/re-create our JSON data, and ensure that each object is created according to the same format when server receives external data
function Location(searchQuery, obj){
  this.search_query = searchQuery;
  this.formatted_query = obj.display_name;
  this.latitude = obj.lat;
  this.longitude = obj.lon;
}

// Constructor function to normalize/re-create our JSON data from weather.json - taking in the "description" (forecast) and "valid_date" (date) of each daily weather prediction
function Weather(obj){
  this.forecast = obj.weather.description;
  this.time = obj.valid_date;
}

// Trail constructor
function Trail(obj){
  this.name = obj.name;
  this.location = obj.location;
  this.length = obj.length;
  this.stars = obj.stars;
  this.star_votes = obj.starVotes;
  this.summary = obj.summary;
  this.trail_url = obj.url;
  this.conditions = `${obj.conditionStatus} ${obj.conditionDetails}`;
  this.condition_date = obj.conditionDate.slice(0, 10);
  this.condition_time = obj.conditionDate.slice(12, 19);
}

// Catch-all (*) in case the route cannot be found
app.get('*', (request, response) => {
  response.status(404).send(errorMessage_404);
})

// Fire up the actual server (turn on the lights, move into the house, start the server, and connect to DB
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Listening on ${PORT}`); 
  })
})