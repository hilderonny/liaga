var db = require('../utils/db');
var auth = require('../utils/auth');

module.exports = function(router) {

    // Freundschaftsanfrage akzeptieren
    router.post('/accept', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var friendshipid = request.body.id;
        var existingfriendships = await db.query('select id, initiator from friendship where accepted = 0 and id = ? and other = ?;', [friendshipid, request.user.id]);
        if (existingfriendships.length < 1) return response.status(400).json({ error: 'Friendship not found' });
        await db.query('update friendship set accepted = 1 where id = ?;', [friendshipid]);
        // Benachrichrigung erstellen
        await db.query('insert into notification (targetplayer, type) values (?, 2);', [existingfriendships[0].initiator]);
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
        var friendships = await db.query('select f.*, player.username, player.level, player.avatarurl, player.greeting, player.hasshop, (select case when (count(quest.id) - count(pq.id)) > 0 then 1 else 0 end from questavailability qa join quest on quest.id = qa.quest left join playerquest pq on pq.quest = quest.id and pq.player = qa.player where quest.creator = player.id and qa.player = ? and (quest.type = 99 or qa.availablefrom <= ?)) hasnewquests, (select case when count(pq.id) > 0 then 1 else 0 end from questavailability qa join quest on quest.id = qa.quest left join playerquest pq on pq.quest = quest.id and pq.player = qa.player where quest.creator = player.id and qa.player = ?) hasrunningquests from (select id friendshipid, case when initiator = ? then 0 else 1 end incoming, case when initiator = ? then other else initiator end playerid, accepted from friendship where initiator = ? or other = ?) f join player on player.id = f.playerid;', [playerid, Date.now(), playerid, playerid, playerid, playerid, playerid]);
        response.status(200).json(friendships);
    });

    // Freundschaftsanfrage ablehnen
    router.post('/reject', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var friendshipid = request.body.id;
        var existingfriendships = await db.query('select id, initiator from friendship where accepted = 0 and id = ? and other = ?;', [friendshipid, request.user.id]);
        if (existingfriendships.length < 1) return response.status(400).json({ error: 'Friendship not found' });
        await db.query('delete from friendship where id = ?;', [friendshipid]);
        // Benachrichrigung erstellen
        await db.query('insert into notification (targetplayer, type) values (?, 3);', [existingfriendships[0].initiator]);
        response.status(200).json({});
    });

    // Alle Quests, die ich von dem Freund bekommen habe auflisten
    router.post('/quests', auth, async function(request, response) {
        if (!request.body.friendid) return response.status(400).json({ error: 'friendid required' });
        var playerid = request.user.id;
        var quests = await db.query('select quest.id questid, quest.title, quest.type, pq.id playerquestid, case when pq.id is null then 0 else 1 end isrunning from questavailability qa join quest on quest.id = qa.quest left join playerquest pq on pq.quest = quest.id and pq.player = qa.player where qa.player = ? and (quest.type = 99 or qa.availablefrom <= ?) and quest.creator = ?;', [ playerid, Date.now(), request.body.friendid ]);
        response.status(200).json(quests);
    });

    return router;
};