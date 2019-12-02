var db = require('../utils/db');
var auth = require('../utils/auth');

module.exports = function(router) {

    /**
     * Benachrichtigungen werden von anderen APIs erzeugt.
     * 
     * Benachrichtigungstypen:
     *  0 - Eine neue Nachricht ist für mich vorhanden (message), sie sollte abgeholt werden
     *  1 - Ich habe eine Freundschaftsanfrage erhalten
     *  2 - Eine von mir gesendete Freundschaftsanfragen wurde bestätigt
     *  3 - Eine von mir gesendete Freundschaftsanfragen wurde abgelehnt
     *  4 - Für mich ist eine neue Quest verfügbar
     *  5 - Eine von mir abgeschlossene Quest wurde vom Ersteller validiert
     *  6 - Eine von mir erstellte Quest hat jemand abgeschlossen und ist nun durch mich validierbar
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