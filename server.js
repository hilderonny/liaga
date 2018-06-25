var express = require("express");
var http = require("http");
var socketio = require("socket.io");

// Create webserver
var app = express();
var httpServer = http.createServer(app);
app.use(express.static("public")); // Use public path for root directory

// Create socket server
var io = socketio(httpServer);
io.on("connection", function(socket) {
  console.log("CONNECT");
  // ping and pong are reserved event names https://github.com/socketio/socket.io/issues/2414#issuecomment-176727699
  socket.on("mypong", function(data) {
    console.log(data);
  });
});
setInterval(function() {
    io.emit("myping");
}, 3000);

// Start web server (and socket server)
httpServer.listen(process.env.PORT, function() {
  console.log("HTTP server running at port " + process.env.PORT);
});















// TEMPLATE STUFF


// server.js
// // where your node app starts

// // init project
// var express = require('express');
// var bodyParser = require('body-parser');
// var app = express();
// app.use(bodyParser.urlencoded({ extended: true }));

// // we've started you off with Express, 
// // but feel free to use whatever libs or frameworks you'd like through `package.json`.

// // http://expressjs.com/en/starter/static-files.html
// app.use(express.static('public'));

// // init sqlite db
// var fs = require('fs');
// var dbFile = './.data/sqlite.db'; 
// var exists = fs.existsSync(dbFile);
// var sqlite3 = require('sqlite3').verbose();
// var db = new sqlite3.Database(dbFile);

// // For database see https://glitch.com/edit/#!/sqlite3-db?path=server.js:1:0 

// // if ./.data/sqlite.db does not exist, create it, otherwise print records to console
// db.serialize(function(){
//   if (!exists) {
//     db.run('CREATE TABLE Dreams (dream TEXT)');
//     console.log('New table Dreams created!');
    
//     // insert default dreams
//     db.serialize(function() {
//       db.run('INSERT INTO Dreams (dream) VALUES ("Find and count some sheep"), ("Climb a really tall mountain"), ("Wash the dishes")');
//     });
//   }
//   else {
//     console.log('Database "Dreams" ready to go!');
//     db.each('SELECT * from Dreams', function(err, row) {
//       if ( row ) {
//         console.log('record:', row);
//       }
//     });
//   }
// });

// // http://expressjs.com/en/starter/basic-routing.html
// app.get("/", function (request, response) {
//   response.sendFile(__dirname + '/views/index.html');
// });

// // endpoint to get all the dreams in the database
// // currently this is the only endpoint, ie. adding dreams won't update the database
// // read the sqlite3 module docs and try to add your own! https://www.npmjs.com/package/sqlite3
// app.get('/getDreams', function(request, response) {
//   db.all('SELECT * from Dreams', function(err, rows) {
//     response.send(JSON.stringify(rows));
//   });
// });

// // listen for requests :)
// var listener = app.listen(process.env.PORT, function () {
//   console.log('Your app is listening on port ' + listener.address().port);
// });
