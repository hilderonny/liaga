/**
 * Used as middleware for API calls to require a logged in user.
 * Attaches the user to the request parameter in apis (request.user). 
 */
const jsonwebtoken = require('jsonwebtoken');
const db = require('./db');

const secret = process.env.SECRET || 'sachichnich';

module.exports = function(request, response, next) {
    const token = request.header('x-access-token');
    if (!token) return response.status(401).json({ error: 'Token is missing' });
    jsonwebtoken.verify(token, secret, function(error, tokenUser) {
        if (error) return response.status(401).json({ error: 'Token cannot be validated' });
        db('users').findOne(tokenUser._id).then(function(user) {
            if (!user) return response.status(401).json({ error: 'User not found' });
            request.user = user;
            next();
        });
    });
}