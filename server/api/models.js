const express = require('express');

module.exports = function(arrangeServer) {

    const router = express.Router();

    router.post('/saveModel', arrangeServer.auth, function(request, response) {
        const collection = arrangeServer.db('models');
        if (request.body._id) {
            collection.findOneAndUpdate({ _id: request.body._id, _ownerId: request.user._id }, { $set: request.body }).then(function(updated) {
                response.json(updated);
            });
        } else {
            request.body._ownerId = request.user._id;
            collection.insert(request.body).then(function(inserted) {
                response.json(inserted);
            });
        }
    });

    return router;
    
}
