'use strict';

// // Global Error messages
// // 500 error message
// const errorMessage_500 = 'Sorry, something went wrong.';
// // 404 error message 
// const errorMessage_404 = 'Sorry, this route does not exist.';

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

// Weather route
app.get('/weather', weatherHandler);

// Trails route
app.get('/trails', trailsHandler);

// Movie route
app.get('/movies', movieHandler);

// Yelp route
app.get('/yelp', yelpHandler);

// "Use" will handle any GET, POST, UPDATE, DELETE requests
app.use('*', handleNotFound);

// Location handler
function locationHandler(request, response){
  const city = request.query.city;
  const url = 'https://us1.locationiq.com/v1/search.php';

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
        console.log('Getting LOCATION info from the DATABASE');
        response.status(200).send(sqlResults.rows[0]);

      } else {
        superagent.get(url)
          .query(queryParams) // superagent feature
          .then(data => {
              const geoData = data.body[0];
              const finalLoc = new Location(city, geoData);

              let sqlQuery = 'INSERT INTO location (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4);';
              let safeValue = [city, finalLoc.formatted_query, finalLoc.latitude, finalLoc.longitude];

              client.query(sqlQuery, safeValue);

              console.log('Getting LOCATION info from the API');
              response.status(200).send(finalLoc);
            }).catch(err => console.log(err))
      }}
)};

// Weather handler
function weatherHandler(request, response){
  let search_query = request.query.search_query;

  const url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${search_query}&key=${process.env.WEATHER_API_KEY}&days=8`;

  superagent.get(url)
    .then(resultsFromSuperAgent => {
      let weatherArray = resultsFromSuperAgent.body.data.map(day => new Weather(day));
      console.log('Getting WEATHER info from the API');
      response.status(200).send(weatherArray);
    }).catch(err => console.log(err));
};

// Trails handler
function trailsHandler(request, response){
  
  let latitude = request.query.latitude;
  let longitude = request.query.longitude;
  
  const url = `https://www.hikingproject.com/data/get-trails?lat=${latitude}&lon=${longitude}&key=${process.env.TRAIL_API_KEY}`;
  
  superagent.get(url)
    .then(resultsFromSuperAgent => {
      let trailArray = resultsFromSuperAgent.body.trails.map(hike => {return new Trail(hike)
      });
      console.log('Getting TRAILS info from the API');
      response.status(200).send(trailArray);
    }).catch(err => console.log(err));
  };

// Movie handler
function movieHandler(request, response){
  let city = request.query.search_query;
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&query=${city}`;
  
  superagent.get(url)
    .then(resultsFromSuperAgent => {
      const movieResults = resultsFromSuperAgent.body.results.map(film => new Movies(film));
      console.log('Getting MOVIE info from the API');
      response.status(200).send(movieResults);
    }).catch(err => console.log(err));
};

// Yelp handler
function yelpHandler(request, response){
  let queryLatitude = request.query.latitude;
  let queryLongitude = request.query.longitude;
  const url = 'https://api.yelp.com/v3/businesses/search'; 

  // Pagination
  const page = request.query.page;
  const numPerPage = 5;
  const start = (page - 1) * numPerPage;

  const queryParams = {
    latitude: queryLatitude,
    longitude: queryLongitude,
    offset: start, // restaurant the list starts at
    limit: numPerPage, // how many it returns from starting point
  }

  // Superagent can SET HEADERS OF A RESPONSE (not with query, but with a different .word() - we'll need this for the Yelp API part of the lab today- Yelp requires you to put your KEY in a HEADER - check docs. Very similar to how we've set queries)
  
 // In order to get key in header (you'll have to do this in Yelp although slightly differently - check documentation for something like "sending key in header"), do this:

  superagent.get(url)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`) // HTTP request
    .query(queryParams)
    .then(data => {
      let restaurantArray = data.body.businesses;
      const finalRestaurants = restaurantArray.map(eatery => {
        return new Restaurant(eatery);
      })

      console.log('Getting YELP info from the API');
      response.status(200).send(finalRestaurants);
    })
};

// 404 handler function
function handleNotFound(request, response){
  response.status(404).send('Sorry, this route does not exist.');
}

// Location constructor to normalize received JSON data
function Location(searchQuery, obj){
  this.search_query = searchQuery;
  this.formatted_query = obj.display_name;
  this.latitude = obj.lat;
  this.longitude = obj.lon;
}

// Weather constructor
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

// Movies constructor
function Movies(obj){
  this.title = obj.original_title;
  this.overview = obj.overview;
  this.average_votes = obj.vote_average;
  this.total_votes = obj.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500/${obj.poster_path}`;
  this.released_on = obj.release_date;
}

// Yelp Restaurant constructor
function Restaurant(obj){
  this.name = obj.name;
  this.image_url = obj.image_url;
  this.price = obj.price;
  this.rating = obj.rating;
  this.url = obj.url;
}

client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Listening on ${PORT}`); 
  })
})