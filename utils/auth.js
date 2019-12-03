var jsonwebtoken = require('jsonwebtoken');
var db = require('./db');

var tokensecret = process.env.TOKENSECRET || 'mytokensecret';

module.exports = function(request, response, next) {
    const token = request.header('x-access-token');
    if (!token) return response.status(401).json({ error: 'Token is missing' });
    jsonwebtoken.verify(token, tokensecret, async function(error, tokenuser) {
        if (error) return response.status(401).json({ error: 'Token cannot be validated' });
        var existingusers = await db.query('select id, username, ep, level, rubies, canselfquest, hasshop from player where id = ?;', [ tokenuser.id ]);
        if (existingusers.length < 1) return response.status(401).json({ error: 'User not found' });
        request.user = existingusers[0];
        next();
    });
};