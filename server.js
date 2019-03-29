"use strict";

require('dotenv').config();

const PORT        = process.env.PORT || 8080;
const ENV         = process.env.ENV || "development";
const express     = require("express");
const bodyParser  = require("body-parser");
const sass        = require("node-sass-middleware");
const app         = express();
const cookieSession = require('cookie-session');
const knexConfig  = require("./knexfile");
const knex        = require("knex")(knexConfig[ENV]);
const morgan      = require('morgan');
const knexLogger  = require('knex-logger');

app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],
  maxAge: 24 * 60 * 60 * 1000
}));

//helper functions for routes
const queries = require('./helper_functions');

// Seperated Routes for each Resource
const usersRoutes = require("./routes/users");

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/styles", sass({
  src: __dirname + "/styles",
  dest: __dirname + "/public/styles",
  debug: true,
  outputStyle: 'expanded'
}));
app.use(express.static("public"));

// Mount all resource routes
app.use("/api/users", usersRoutes(knex));

// Home page
app.get("/", (req, res) => {
  let templateVars = {user: req.session.user_id};
  res.render("index" , templateVars);
});

//Register page
app.get("/register", (req, res) => {
  let templateVars = {user: req.session.user_id}
  res.render("register", templateVars);
});

//Login page
app.get("/login", (req, res) => {
  let templateVars = {user: req.session.user_id}
  res.render("login", templateVars);
});


app.post("/login", (req, res) => {
  knex('users').where({email: req.body.email}).then(res  => {
  req.session.user_id = res[0].id})
  res.redirect('/')
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/')
});

app.post("/register", (req, res) => {
  queries.addUser(knex, req.body)
  knex('users').where({email: req.body.email}).then(res  => {
    console.log(res[0].id)
  req.session.user_id = res[0].id})
  res.redirect('/')
});

app.get('/search/:keyword', (req, res) => {
  knex.select('*').from('resources')
      .join('resource_keywords', 'resources.id', 'resource_keywords.resource_id')
      .join('keywords', 'resource_keywords.keyword_id', 'keywords.id')
      .join('users', 'resources.user_id', 'users.id')
      .where('keywords.name', req.params.keyword) // search by keyword
      .orWhere('users.name', req.params.keyword) //search by user's name
      .then((results) => {
        res.json(results);
    });
});

app.put('/resources/:resourceId', (req, res) => {
  function likeTweet (tweetId, callback) {
    db.collection("tweets").updateOne({'_id': ObjectId(tweetId)}, { $inc: { "like": 1}});
    callback(null, true);
  }
  likeTweet(req.params.tweetId, (err, res) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      console.log('updated');
    }
  });
});

app.listen(PORT, () => {
  console.log("Example app listening on port " + PORT);
});
