const functions = require("firebase-functions");
const app = require('express')();
const bodyParser = require('body-parser');
const axios  = require('axios');

app.use(bodyParser.json())

/*
Example: 
{
    "location": "-37.815340,144.963230",
    "categories": [
        "movie_theater",
        "park"
    ]
}

catogries must be of types from https://developers.google.com/maps/documentation/places/web-service/supported_types

*/
app.post('/nearby', async (req, res) => {
    const categories = req.body.categories;
    const allPlaceRequests = categories.map((category) => {
        return axios.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json",
        {
            params: {
                key: require("./apikey"),
                location: req.body.location,
                radius: "1000",
                type: category,
                open: true
            }
        })
    })
    var results = [];
    axios.all(allPlaceRequests)
    .then(resultsArr => {
        resultsArr.map(r => {
            results = [...results, ...r.data.results];
        })
        results = Array.from(new Set(results));
        shuffle(results);
        return res.status(200).json({ results });
    })
    .catch(err => {
        console.error(err);
        return res.status(500).end();
    })
});


const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
exports.api = functions.https.onRequest(app);