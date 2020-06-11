DROP TABLE IF EXISTS location;

CREATE TABLE location (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7)
);

INSERT INTO location (search_query, formatted_query, latitude, longitude) VALUES ('seattle', 'Seattle, King County, Washington, USA', '47.6038321', '-122.3300624');

-- Write an INSERT statement here
-- Insert a city that matches searchquery, formatted_query, lat, long
-- Can do this with a regular search on the front end - you're already getting this with your response object (exactly what you get back from your Constructor when you search for a city - those four values)
-- Don't worry about inserting ID - does this automatically
-- To test: Keep trying to search for a city you know is in the DB and see if it keeps calling to the API (shouldn't be if it's happening correctly)
-- Put a console.log ABOVE and INSIDE your superagent call and see which one gets hit each time
-- As soon as that works, THEN go to the INSERT - but initial check needs to work in the first place