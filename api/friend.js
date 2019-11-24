var db = require('../utils/db');
var auth = require('../utils/auth');

module.exports = function(router) {

    // Freundschaftsanfrage akzeptieren
    router.post('/accept', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var friendshipid = request.body.id;
        var existingfriendships = await db.query('select id from friendship where accepted = 0 and id = ? and other = ?;', [friendshipid, request.user.id]);
        if (existingfriendships.length < 1) return response.status(400).json({ error: 'Friendship not found' });
        await db.query('update friendship set accepted = 1 where id = ?;', [friendshipid]);
        response.status(200).send();
    });

    // Freundschaftsanfrage an anderen Spieler senden
    router.post('/add', auth, async function(request, response) {
        if (!request.body.playerid) return response.status(400).json({ error: 'playerid required' });
        var playerid = request.user.id;
        var targetplayerid = request.body.playerid;
        var existingplayers = await db.query('select id from player where id = ?;', [targetplayerid]);
        if (existingplayers.length < 1) return response.status(400).json({ error: 'Player not found' });
        var existingfriendships = await db.query('select id from friendship where (initiator = ? and other = ?) or (initiator = ? and other = ?);', [playerid, targetplayerid, targetplayerid, playerid]);
        if (existingfriendships.length > 0) return response.status(400).json({ error: 'Friendship already existing' });
        var insertresult = await db.query('insert into friendship (initiator, other, accepted) values (?, ?, 0);', [playerid, targetplayerid]);
        // Benachrichrigung erstellen
        await db.query('insert into notification (targetplayer, type) values (?, 1);', [targetplayerid]);
        response.status(200).json(insertresult.insertId);
    });

    // Freunde und Freundschaftsanfragen auflisten
    router.post('/list', auth, async function(request, response) {
        var playerid = request.user.id;
        var friendships = await db.query('select friendship.id friendshipid, friendship.accepted, friendship.initiator friendshipinitiator, friendship.other friendshipother, initiator.username initiatorusername, other.username otherusername from friendship left join player initiator on friendship.initiator = initiator.id left join player other on friendship.other = other.id where friendship.initiator = ? or friendship.other = ?;', [playerid, playerid]);
        var result = friendships.map(function(friendship) {
            return {
                id: friendship.friendshipinitiator === playerid ? friendship.friendshipother : friendship.friendshipinitiator,
                username: friendship.friendshipinitiator === playerid ? friendship.otherusername : friendship.initiatorusername,
                friendshipid: friendship.friendshipid,
                accepted: friendship.accepted
            };
        });
        response.status(200).json(result);
    });

    // Freundschaftsanfrage ablehnen
    router.post('/reject', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var friendshipid = request.body.id;
        var existingfriendships = await db.query('select id from friendship where accepted = 0 and id = ? and other = ?;', [friendshipid, request.user.id]);
        if (existingfriendships.length < 1) return response.status(400).json({ error: 'Friendship not found' });
        await db.query('delete from friendship where id = ?;', [friendshipid]);
        response.status(200).send();
    });

    return router;
};