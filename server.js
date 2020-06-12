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

// // Restaurant route
// app.get('/restaurants', restaurantHandler);

// "Use" will handle any GET, POST, UPDATE, DELETE requests
app.use('*', handleNotFound);

// Location handler
function locationHandler(request, response){
  const city = request.query.city;
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

  let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${search_query}&key=${process.env.WEATHER_API_KEY}&days=8`;

  superagent.get(url)
    .then(resultsFromSuperAgent => {
      let weatherArray = resultsFromSuperAgent.body.data.map(day => new Weather(day));
      console.log('Getting WEATHER info from the DATABASE');
      response.status(200).send(weatherArray);
    }).catch(err => console.log(err));
};

// Trails handler
function trailsHandler(request, response){
  
  let latitude = request.query.latitude;
  let longitude = request.query.longitude;
  
  let url = `https://www.hikingproject.com/data/get-trails?lat=${latitude}&lon=${longitude}&key=${process.env.TRAIL_API_KEY}`;
  
  superagent.get(url)
    .then(resultsFromSuperAgent => {
      let trailArray = resultsFromSuperAgent.body.trails.map(hike => {return new Trail(hike)
      });
      console.log('Getting TRAILS info from the DATABASE');
      response.status(200).send(trailArray);
    }).catch(err => console.log(err));
  };

// Movie handler
function movieHandler(request, response){
  let city = request.query.search_query;
  const url = 'https://api.themoviedb.org/3/search/movie/';

  const queryParams = {
    api_key: key,
    query: city
  }
  
  superagent.get(url)
    .query(queryParams)
    .then(resultsFromSuperAgent => {
      const movieResults = resultsFromSuperAgent.body.results.map(film => new Movies(film));
      response.status(200).send(movieResults);
    }).catch(err => console.log(err));
};


// // Restaurant handler
// function restaurantHandler(request, response){
//   console.log('This is our RESTAURANT route', request);

//   // Pagination
//   const page = request.query.page;
//   const numPerPage = 5;
//   const start = (page - 1) * numPerPage;

//   // needs to be YELP - check query params
//   const url = 'https://developers.zomato.com/api/v2.1/search'; 

//   const queryParams = { // Params are from Zomato docs - similar to Yelp
//     lat: request.query.latitude,
//     start: start, // restaurant the list starts at
//     count: numPerPage, // how many it returns from starting point
//     lng: request.query.longitude
//   }

//   // Superagent can SET HEADERS OF A RESPONSE (not with query, but with a different .word() - we'll need this for the Yelp API part of the lab today- Yelp requires you to put your KEY in a HEADER - check docs. Very similar to how we've set queries)
  
//  // In order to get key in header (you'll have to do this in Yelp although slightly differently - check documentation for something like "sending key in header"), do this:

//   superagent.get(url)
//     .set('user-key', process.env.YELP_API_KEY)
//     .query(queryParams)
//     .then(data => {
//       console.log('Restaurant data from SUPERAGENT', data.body);
//       let restaurantArray = data.body.restaurants;
//       console.log('This is my RESTAURANT ARRAY', restaurantArray[0]);

//       const finalRestaurants = restaurantArray.map(eatery => {
//         return new Restaurant(eatery);
//       })

//       response.status(200).send(finalRestaurants);
//     })
// };




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

// Movie constructor
function Movies(movieData){
  this.title = movieData.original_title;
  this.overview = movieData.overview;
  this.average_votes = movieData.vote_average;
  this.image_url = movieData.vote_count;
  this.popularity = movieData.popularity;
  this.released_on = movieData.release_date;
}

// Restaurant constructor
function Restaurant(obj){
  this.restaurant = obj.restaurant.name;
  this.cuisines = obj.restaurant.cuisines;
  this.locality = obj.restaurant.location.locality;
}



// // Catch-all (*) in case the route cannot be found
// app.get('*', (request, response) => {
//   response.status(404).send(errorMessage_404);
// })

// Fire up the actual server (turn on the lights, move into the house, start the server, and connect to DB
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Listening on ${PORT}`); 
  })
})


// With Yelp:
  // We're going to do the EXACT same thing we just did, except with Yelp
  // Use same process we just went through to SET THE HEADER
  // Need to paginate some sort of results - just say: when they click "load more", make more results display on the page
  // Yelp is by far the hardest API because of the key in the header
  // Only need pagination with Yelp (movies and trails are MAYBE stretch goals if you wanted to add a button)

  
  // Write your routes from now on with the queryParams split up from the URL
  // Refactor into separate handlers/app.get(); as we did in lab
    // This is just good code and better writing
    // No longer need try/catch blocks

  // Need to incorporate DB functionality into these new functions, too
  // Add movies from scratch
  // Add Yelp from scratch
    // Paginate Yelp
  