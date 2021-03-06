const functions = require("firebase-functions");
const app = require("express")();
const axios = require("axios");
const cors = require('cors')
const apikey = require('./apikey')

const serviceAccount = require("./serviceAccountKey.json");
const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
app.use(cors());

/*
    Example: 
    {
        "location": "-37.815340,144.963230",
        "categories": [
            "movie_theater",
            "park"
        ],
        "num_results": 100
    }
    
    categories must be of types from https://developers.google.com/maps/documentation/places/web-service/supported_types
*/
app.post("/nearby", async (req, res) => {
  const categories = req.body.categories;
  const allPlaceRequests = categories.map((category) => {
    return axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          key: apikey,
          location: req.body.location,
          radius: "1000",
          type: category,
          opennow: true,
        },
      }
    );
  });
  var results = [];
  axios
    .all(allPlaceRequests)
    .then((response) => {
      response.map((r) => {
        const data = r.data.results;
        results = [...results, ...data];
      });
      results = Array.from(new Set(results));
      shuffle(results);
      
      if ('num_results' in req.body) results = results.slice(0, req.body.num_results);

      return res.status(200).json({ results });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).end();
    });
});

app.get('/photo/:photo_ref', (req, res) => {
    axios.get("https://maps.googleapis.com/maps/api/place/photo", {
        params: {
          maxwidth: 400,
          photo_reference: req.params.photo_ref,
          key: apikey,
        },
        headers:{
          "Access-Control-Allow-Origin" : "*"
        }
    })
    .then(response => {
        return res.json({url: response.request._redirectable._options.href});
    })
    .catch( err => console.error(err))
})

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
exports.api = functions.https.onRequest(app);
