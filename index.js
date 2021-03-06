const functions = require("firebase-functions");
const app = require("express")();
const axios = require("axios");
const cors = require("cors");
const apikey = require("./apikey");

const serviceAccount = require("./serviceAccountKey.json");
const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());

/*
    Example: 
    {
        {
          "location": "-37.815340,144.963230",
          "categories": [
              "amusement_park",
              "aquarium",
              "art_gallery",
              "bar",
              "campground",
              "casino",
              "night_club",
              "shopping_mall",
              "spa",
              "stadium",
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
  await axios
    .all(allPlaceRequests)
    .then(async (response) => {
      response.map((r) => {
        const data = r.data.results;
        results = [...results, ...data];
      });
      results = Array.from(new Set(results));
      shuffle(results);

      if ("num_results" in req.body)
        results = results.slice(0, req.body.num_results);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).end();
    });

  // Add photo_url to all results
  const photo_url_results = [];
  await axios
    .all(
      results.map((result) => {
        if (!('photos' in result)) return undefined
        return axios.get("https://maps.googleapis.com/maps/api/place/photo", {
          params: {
            maxwidth: 1000,
            photo_reference: result.photos[0].photo_reference,
            key: apikey,
          },
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          timeout: 5000,
        });
      })
    )
    .then((responses) => {
      responses.forEach((response, idx) => {
        const ans = results[idx];
        ans.photo_url = response !== undefined ? response.request._redirectable._options.href : "https://designshack.net/wp-content/uploads/placeholder-image.png";
        photo_url_results.push(ans);
      });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).end();
    });

  // Add info
  const info_photo_results = [];
  await axios.all(
    photo_url_results.map((result) => {
      return axios.get("https://maps.googleapis.com/maps/api/place/details/json", {
        params: {
          place_id: result.place_id,
          key: apikey
        },
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        timeout: 5000
      })
    }))
    .then (responses => {
      responses.forEach((response, idx) => {
        const ans = photo_url_results[idx];
        ans.info = response.data;
        info_photo_results.push(ans);
      })
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).end();
    });

  return res.status(200).json({ results: info_photo_results });
});

app.get("/test/nearby", (req, res) => {
  const body = {
    location: "-37.815340,144.963230",
    categories: [
      "amusement_park",
      "aquarium",
      "art_gallery",
      "bar",
      "campground",
      "casino",
      "night_club",
      "shopping_mall",
      "spa",
      "stadium",
      "movie_theater",
      "park",
    ],
    num_results: 100,
  };
  const categories = body.categories;
  const allPlaceRequests = categories.map((category) => {
    return axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          key: apikey,
          location: body.location,
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
    .then(async (response) => {
      response.map((r) => {
        const data = r.data.results;
        results = [...results, ...data];
      });
      results = Array.from(new Set(results));
      shuffle(results);

      if ("num_results" in req.body)
        results = results.slice(0, body.num_results);

      return res.status(200).json({ results });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).end();
    });
});

// Pass in photo reference

app.get("/photo/:photo_ref", (req, res) => {
  axios
    .get("https://maps.googleapis.com/maps/api/place/photo", {
      params: {
        maxwidth: 400,
        photo_reference: req.params.photo_ref,
        key: apikey,
      },
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    })
    .then((response) => {
      return res.json({ url: response.request._redirectable._options.href });
    })
    .catch((err) => console.error(err));
});

// Get place info
app.get("/place/:place_id", (req, res) => {
  axios
    .get("https://maps.googleapis.com/maps/api/place/details/json", {
      params: {
        place_id: req.params.place_id,
        key: apikey,
      },
    })
    .then((response) => {
      return res.json({ data: response.data });
    })
    .catch((err) => console.error(err));
});

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
exports.api = functions.https.onRequest(app);
