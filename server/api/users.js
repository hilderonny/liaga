const express = require('express');

module.exports = function(arrangeServer) {

    const router = express.Router();

    router.get('/listUsers', arrangeServer.auth.bind(arrangeServer), async function(request, response) {
        const users = await arrangeServer.db('users').find({}, '_id username');
        response.json(users);
    });

    return router;
    
}
