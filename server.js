"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
const bodyParser = require("body-parser");
const Schema = mongoose.Schema;
let dns = require("dns");
const cors = require("cors");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/

mongoose
  .connect(process.env.MONGO_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true
  })
  .then(() => console.log("DB Connected!"))
  .catch(err => {
    console.log(`DB Connection Error: ${err.message}`);
  });

// Mongoose Schema
let db_url = new Schema({
  short_URL: String,
  url: String
});

let Model = mongoose.model("model", db_url, "short_URL");

app.use(cors());

// mounting the body-parser
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// redirect short url
app.get("/api/shorturl/:short_URL", (req, res) => {
  const input = req.params.short_URL;

  Model.findOne({ short_URL: input }, (err, result) => {
    if (result) {
      res.redirect(`http://${result.url}`);
    } else {
      res.json({
        error: "invalid URL"
      });
    }
  });
});

// URL Convertor
app.post("/api/shorturl/new", (req, res) => {
  let url = req.body.url;

  // remove https
  url = url.replace(/^https?:\/\//, "");

  //   if url is invalid
  dns.lookup(url, (err, data) => {
    if (err) {
      //      show invalid URL
      res.json({
        error: "invalid URL"
      });
      //      if url is valid
    } else {
      //      loop through db
      const url_finder = () =>
        new Promise((res, rej) => {
          res(Model.findOne({ url }));
        });

      url_finder().then(data => {
        //     if url found in db
        if (data) {
          //       show it
          res.json({
            original_url: url,
            short_url: data.short_URL
          });
        } else {
          //      get collection length for id
          Model.countDocuments({}, async function(err, count) {
            let new_url = new Model({
              short_URL: count + 1,
              url
            });
            new_url.save();

            res.json({
              original_url: url,
              short_url: count + 1
            });
          });
        }
      });
    }
  });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
