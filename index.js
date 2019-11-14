var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var app = express();
var http = require('http').createServer(app);

// Statische Seiten unter Root-URL bereit stellen
app.use(express.static('public'));
// POST-Daten als JSON in request.body bereit stellen
app.use(bodyParser.json());


// API Skripte einbinden. Diese enthalten sowohl die Express Routen als auch die Socket-Handler.
fs.readdirSync(__dirname + '/api').forEach(function(filename) {
    var apiname = filename.split('.')[0];
    var apirouter = require('./api/' + apiname);
    app.use('/api/' + apiname, apirouter);
});

// Server starten
http.listen(process.env.PORT, function () {
    console.log('listening on port ' + process.env.PORT);
});