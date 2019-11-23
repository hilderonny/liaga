var express = require('express');
var db = require('./utils/db');
var http = require('http');
var bodyparser = require('body-parser');
var fs = require('fs');

// Prepare the server
var app = express();
app.use(bodyparser.json());
app.use('/', express.static('./public'));
fs.readdirSync('./api/').forEach(function(apifile) {
    var apiname = apifile.split('.')[0];
    console.log('Adding API ' + apiname);
    app.use('/api/' + apiname, require('./api/' + apiname)(express.Router()));
});

// Connect to database and then start the server
db.connect().then(async function() {
    var schema = JSON.parse(fs.readFileSync('./dbschema.json'));
    await db.init(schema);
    http.createServer(app).listen(process.env.PORT, function() {
        console.log('App listening on port ' + process.env.PORT);
    });
});
