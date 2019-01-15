// So soll es künftig sein
const express = require('express');
const arrange = require('../lib/arrange/index');

// Arrange mit Standardfunktionen initialisieren
const server = new arrange.Server(
    process.env.PORT || 8080, 
    process.env.DBURL || '127.0.0.1:27017/liaga',
    process.env.USECORS || true,
    process.env.TOKENSECRET || 'sachichnich'
);
// Statische Seiten unter Root-URL bereit stellen
server.app.use('/', express.static(__dirname + '/../client'));
// APIs definieren
server.app.use('/api/model', require('./api/model')(server));
// Server starten
server.start();
