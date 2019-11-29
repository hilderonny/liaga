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
        response.status(200).json({});
    });

    // Freundschaftsanfrage an anderen Spieler senden
    router.post('/add', auth, async function(request, response) {
        if (!request.body.username) return response.status(400).json({ error: 'username required' });
        var targetusername = request.body.username;
        if (targetusername === request.user.username) return response.status(400).json({ error: 'Cannot add friendship to oneself' });
        var playerid = request.user.id;
        var existingplayers = await db.query('select id from player where username = ?;', [ targetusername ]);
        if (existingplayers.length < 1) return response.status(400).json({ error: 'Player not found' });
        var targetplayerid = existingplayers[0].id;
        var existingfriendships = await db.query('select id from friendship where (initiator = ? and other = ?) or (initiator = ? and other = ?);', [playerid, targetplayerid, targetplayerid, playerid]);
        if (existingfriendships.length > 0) return response.status(400).json({ error: 'Friendship already existing' });
        var insertresult = await db.query('insert into friendship (initiator, other, accepted) values (?, ?, 0);', [playerid, targetplayerid]);
        // Benachrichrigung erstellen
        await db.query('insert into notification (targetplayer, type) values (?, 1);', [targetplayerid]);
        response.status(200).json(insertresult.insertId);
    });

    // Freundschaft löschen, sofern ich einer der beteiligten bin
    router.post('/delete', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var friendshipid = request.body.id;
        var playerid = request.user.id;
        var existingfriendships = await db.query('select id from friendship where id = ? and (initiator = ? or other = ?);', [ friendshipid, playerid, playerid ]);
        if (existingfriendships.length < 1) return response.status(400).json({ error: 'Friendship not found' });
        await db.query('delete from friendship where id = ?;', [ friendshipid ]);
        response.status(200).json({});
    });

    // Freunde und Freundschaftsanfragen auflisten
    router.post('/list', auth, async function(request, response) {
        var playerid = request.user.id;
        var friendships = await db.query('select friendship.id friendshipid, friendship.accepted, friendship.initiator friendshipinitiator, friendship.other friendshipother, initiator.username initiatorusername, other.username otherusername, initiator.level initiatorlevel, other.level otherlevel from friendship left join player initiator on friendship.initiator = initiator.id left join player other on friendship.other = other.id where friendship.initiator = ? or friendship.other = ?;', [playerid, playerid]);
        var result = friendships.map(function(friendship) {
            return {
                friendid: friendship.friendshipinitiator === playerid ? friendship.friendshipother : friendship.friendshipinitiator,
                username: friendship.friendshipinitiator === playerid ? friendship.otherusername : friendship.initiatorusername,
                friendshipid: friendship.friendshipid,
                accepted: friendship.accepted,
                incoming: friendship.friendshipinitiator !== playerid,
                level: friendship.friendshipinitiator === playerid ? friendship.otherlevel : friendship.initiatorlevel
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
        response.status(200).json({});
    });

    return router;
};