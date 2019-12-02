var db = require('../utils/db');
var auth = require('../utils/auth');

module.exports = function(router) {

    /**
     * Benachrichtigungen werden von anderen APIs erzeugt.
     * 
     * Benachrichtigungstypen:
     *  0 - Eine Neue Nachricht ist für mich vorhanden (message), sie sollte abgeholt werden
     */

    // Liefert alle offenen Benachrichtigungen für mich und löscht diese anschließend
    router.post('/fetch', auth, async function(request, response) {
        var playerid = request.user.id;
        var result = await db.query('select type from notification where targetplayer = ?;', [playerid]);
        await db.query('delete from notification where targetplayer = ?;', [playerid]);
        var notifications = {};
        result.forEach(function(n) {
            notifications[n.type] = true;
        });
        response.status(200).json(Object.keys(notifications));
    });

    return router;
};