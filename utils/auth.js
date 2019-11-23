var jsonwebtoken = require('jsonwebtoken');
var db = require('./db');

var tokensecret = process.env.TOKENSECRET || 'mytokensecret';

module.exports = function(request, response, next) {
    const self = this;
    const token = request.header('x-access-token');
    if (!token) return response.status(401).json({ error: 'Token is missing' });
    jsonwebtoken.verify(token, tokensecret, async function(error, tokenuser) {
        if (error) return response.status(401).json({ error: 'Token cannot be validated' });
        var existingusers = await db.query('select id, username from player where username = ?;', [request.body.username]);
        if (existingusers.length < 1) return response.status(401).json({ error: 'User not found' });
        request.user = existingusers[0];
        next();
    });
};