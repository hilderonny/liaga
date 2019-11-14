var express = require('express');
var app = express();
var http = require('http').createServer(app);
var bodyParser = require('body-parser');

// Statische Seiten unter Root-URL bereit stellen
app.use(express.static('public'));

// Server starten
http.listen(process.env.PORT, function () {
    console.log('listening on port ' + process.env.PORT);
});