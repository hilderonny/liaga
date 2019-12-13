var auth = require('../utils/auth');
var pushmessages = require('../utils/pushmessages');

module.exports = function(router) {

    router.post('/checkpublickey', auth, function(request, response) {
        var playerid = request.user.id;
        var publickey = request.body.publickey;
        var serverpublickey = pushmessages.checkpublickey(playerid, publickey);
        response.status(200).json({ publickey: serverpublickey });
    });

    router.post('/setendpoint', auth, function(request, response) {
        var playerid = request.user.id;
        var publickey = request.body.publickey;
        var subscription = request.body.subscription;
        var success = pushmessages.setendpoint(playerid, publickey, subscription);
        if (!success) return response.status(404).send("Player or public key not found");
        response.status(200).json({});
    });

    return router;
};