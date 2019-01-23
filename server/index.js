// So soll es künftig sein
const express = require('express');
const arrange = require('@hilderonny/arrange');

// Arrange mit Standardfunktionen initialisieren
const server = new arrange.Server(
    process.env.PORT || 8080, 
    process.env.DBURL || '127.0.0.1:27017/liaga',
    process.env.TOKENSECRET || 'sachichnich'
);
// Statische Seiten unter Root-URL bereit stellen
server.app.use('/', express.static(__dirname + '/../client'));
// APIs definieren
server.app.use('/api/models', require('./api/models')(server));
server.app.use('/api/users', require('./api/users')(server));
// Server starten
server.start();
