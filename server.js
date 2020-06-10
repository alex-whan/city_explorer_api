'use strict';

// Global Error messages
// 500 error message
const errorMessage_500 = 'Sorry, something went wrong.';
// 404 error message 
const errorMessage_404 = 'Sorry, this route does not exist.';

// Express library sets up our server
// Bringing in a library takes TWO steps:
  // 1) "Require" it (below)
  // 2) Install it
const express = require('express');

// "Bodyguard" of course server - indicates who is OK to send data to
const cors = require('cors');

// bring in our SuperAgent library (goes out and gets data from internet)
const superagent = require('superagent');

// dotenv lets us get our secrets from our .env file
require('dotenv').config();

// Initializes our Express library into our variable called "app"
const app = express();

// Bring in the PORT by using process.env.variable name
const PORT = process.env.PORT || 3001;

// Tells CORS to let "app" work
app.use(cors());

// "Location" must happen before Weather/Trails as they rely on its data

// GET LOCATION DATA
// Use the "app" variable and .get() method to get/return data along the '/location' route and run it through the constructor function to normalize it
app.get('/location', (request, response) => {
  try{
    let city = request.query.city;
    
    let url = `https://us1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json`;

    superagent.get(url)
      .then(resultsFromSuperAgent => {
        let finalObj = new Location(city, resultsFromSuperAgent.body[0]);
        response.status(200).send(finalObj);
      })
  // Error message in case there's an error with the server/API call
  } catch(err){
    response.status(500).send(errorMessage_500);
  }
})

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
      })
  } catch(err){
    response.status(500).send(errorMessage_500);
  }
})

app.get('/trails', (request, response) => {
  try{
    let lat = request.query.latitude;
    let long = request.query.longitude;
    let url = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${long}&maxDistance=10&key=${process.env.TRAIL_API_KEY}`
    
    superagent.get(url)
      .then(resultsFromSuperAgent => {
        let trailArray = resultsFromSuperAgent.body.trails.map(hike => new Trail(hike));
        response.status(200).send(trailArray);
      })
  } catch(err){
      response.status(500).send(errorMessage_500);
  }
})

// Constructor function to normalize/re-create our JSON data, and ensure that each object is created according to the same format when server receives external data
function Location(searchQuery, obj){
  this.search_query = searchQuery;
  this.formatted_query = obj.display_name;
  this.latitude = obj.latitude;
  this.longitude = obj.longitude;
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
  this.trailLength = obj.length;
  this.stars = obj.stars;
  this.star_votes = obj.star_votes;
  this.summary = obj.summary;
  this.trail_url = obj.trail_url;
  this.conditions = obj.condition_status;
  this.condition_date = obj.condition_date;
  this.condition_time = obj.condition_time;
}

// Catch-all (*) in case the route cannot be found
app.get('*', (request, response) => {
  response.status(404).send(errorMessage_404);
})

// Fire up the actual server (turn on the lights, move into the house, and start the server)
app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
})