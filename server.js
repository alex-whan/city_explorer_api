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

// Use the "app" variable and .get() method to get/return data along /location route and run it through the constructor function to normalize it
app.get('/location', (request, response) => {
  try{
    console.log(request.query.city);
    let search_query = request.query.city;

    let geoData = require('./data/location.json');

    let returnObj = new Location(search_query, geoData[0]);

    console.log(returnObj);

    response.status(200).send(returnObj);

  } catch(err){
    console.log('ERROR', err);
    response.status(500).send('Sorry, something went wrong.');
  }
})

function Location(searchQuery, obj){
  this.search_query = searchQuery;
  this.formatted_query = obj.display_name;
  this.latitude = obj.lat;
  this.longitude = obj.lon;
}

app.get('*', (request, response) => {
  response.status(404).send('Sorry, this route does not exist.');
})

// Fire up the actual server (turn on the lights, move into the house, and start the server)
app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
})