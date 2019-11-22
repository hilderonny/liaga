var arrange = require('@hilderonny/arrange');
var express = require('express');

// Startup the server.
var server = new arrange.Server(
    process.env.PORT || 8080, 
    process.env.DBURL || '127.0.0.1:27017/liaga',
    process.env.TOKENSECRET || 'mytokensecret'
);

// Define static HTML URL
server.app.use('/', express.static(__dirname + '/public'));

// Define APIs
server.app.post('/api/getepthresholds', require('./api/getepthresholds'));

server.start();
