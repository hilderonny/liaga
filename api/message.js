var db = require('../utils/db');
var auth = require('../utils/auth');

module.exports = function(router) {

    // Freund schickt Nachricht an anderen Freund
    router.post('/send', auth, async function(request, response) {
        if (!request.body.to) return response.status(400).json({ error: 'to required' });
        if (!request.body.content) return response.status(400).json({ error: 'content required' });
        var playerid = request.user.id;
        var toplayerid = request.body.to;
        var existingplayers = await db.query('select player.username from friendship join player on player.id = friendship.other where friendship.accepted = 1 and ((friendship.initiator = ? and friendship.other = ?) or (friendship.initiator = ? and friendship.other = ?));', [playerid, toplayerid, toplayerid, playerid]);
        if (existingplayers.length < 1) return response.status(400).json({ error: 'Player not found' });
        await db.query('insert into message (fromplayer, toplayer, title, content) values (?, ?, ?, ?);', [
            playerid,
            toplayerid,
            "Nachricht von " + request.user.username,
            request.body.content
        ]);
        await db.query('insert into notification (targetplayer, type) values (?, 0);', [toplayerid]);
        response.status(200).json({});
    });

    // Alle an mich addressierten Nachrichten auflisten
    router.post('/list', auth, async function(request, response) {
        var playerid = request.user.id;
        var messages = await db.query('select id, fromplayer, title, content, isread from message where toplayer = ? order by id desc;', [playerid]);
        response.status(200).json(messages);
    });

    // Nachricht als gelesen markieren
    router.post('/markasread', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var messageid = request.body.id;
        var existingmessages = await db.query('select id from message where id = ? and toplayer = ?;', [messageid, request.user.id]);
        if (existingmessages.length < 1) return response.status(400).json({ error: 'Message not found' });
        await db.query('update message set isread=1 where id = ?;', [messageid]);
        response.status(200).json({});
    });

    // Nachricht löschen
    router.post('/delete', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var messageid = request.body.id;
        var existingmessages = await db.query('select id from message where id = ? and toplayer = ?;', [messageid, request.user.id]);
        if (existingmessages.length < 1) return response.status(400).json({ error: 'Message not found' });
        await db.query('delete from message where id = ?;', [messageid]);
        response.status(200).json({});
    });

    return router;
};