'use strict';

// Express library sets up our server
// Bringing in a library takes TWO steps:
  // 1) "Require" it (below)
  // 2) Install it
const express = require('express');

// Initializes our Express library into our variable called "app"
const app = express();

// dotenv lets us get our secrets from our .env file
require('dotenv').config();

// "Bodyguard" of course server - indicates who is OK to send data to
const cors = require('cors');
app.use(cors());

// Bring in the PORT by using process.env.variable name
const PORT = process.env.PORT || 3001;


// GET LOCATION DATA
// Use the "app" variable and .get() method to get/return data along the '/location' route and run it through the constructor function to normalize it
app.get('/location', (request, response) => {
  try{
    console.log(request.query.city);
    let search_query = request.query.city;

    let geoData = require('./data/location.json');

    let returnObj = new Location(search_query, geoData[0]);

    console.log(returnObj);

    response.status(200).send(returnObj);

  // Error message in case there's an error with the server/API call
  } catch(err){
    console.log('LOCATION ERROR', err);
    response.status(500).send('Sorry, something went wrong.');
  }
})

// Constructor function to normalize/re-create our JSON data, and ensure that each object is created according to the same format when server receives external data
function Location(searchQuery, obj){
  this.search_query = searchQuery;
  this.formatted_query = obj.display_name;
  this.latitude = obj.lat;
  this.longitude = obj.lon;
}

// GET WEATHER DATA
// Use the "app" variable and .get() method to get/return data along the '/location' route and run it through the constructor function to normalize it - using a forEach loop

app.get('/weather', (request, response) => {
  try{
    
    let search_query = request.query.city;

    // Empty array to hold weather data
    let weatherArray = [];

    let weatherData = require('./data/weather.json');

    weatherData.data.forEach(value => {
      let weatherForecast = new Weather[value];
      weatherArray.push(weatherForecast);
    })

    response.status(200).send(returnObj);

  } catch(err){
    console.log('WEATHER ERROR', err);
    response.status(500).send('Sorry, something went wrong.');
  }
})


// Constructor function to normalize/re-create our JSON data from weather.json - taking in the "description" (forecast) and "valid_date" (date) of each daily weather prediction
function Weather(obj){
  this.forecast = obj.weather.description;
  this.date = obj.valid_date;
}


// Catch-all (*) in case the route cannot be found
app.get('*', (request, response) => {
  response.status(404).send('Sorry, this route does not exist.');
})

// Fire up the actual server (turn on the lights, move into the house, and start the server)
app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
})