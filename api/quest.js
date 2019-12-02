var db = require('../utils/db');
var auth = require('../utils/auth');

module.exports = function(router) {

    var types = [
        0, // Einmalig
        1, // Täglich
        2, // Wöchentlich
        99, // Beliebig oft
    ]

    // Neue Quest erstellen
    router.post('/add', auth, async function(request, response) {
        if (!request.body.title) return response.status(400).json({ error: 'title required' });
        if (!request.body.description) return response.status(400).json({ error: 'description required' });
        if (!request.body.effort) return response.status(400).json({ error: 'effort required' });
        if (!request.body.type) return response.status(400).json({ error: 'type required' });
        var effort = parseInt(request.body.effort);
        if (!effort) return response.status(400).json({ error: 'effort invalid' });
        var type = parseInt(request.body.type);
        if (types.indexOf(type) < 0) return response.status(400).json({ error: 'type invalid' });
        var topic = request.body.topic || "";
        if (topic.length > 255) topic = topic.subString(0, 255);
        var title = request.body.title;
        if (title.length > 255) title = title.subString(0, 255);
        var description = request.body.description;
        if (description.length > 65535) description = description.subString(0, 65535);
        var playerid = request.user.id;
        // Quest erstellen
        var questresult = await db.query('insert into quest (topic, title, description, effort, type, creator) values (?, ?, ?, ?, ?, ?);', [
            topic,
            title,
            description,
            effort,
            type,
            playerid
        ]);
        var questid = questresult.insertId;
        // Verfügbarkeit speichern
        if (request.body.players && request.body.players.length) {
            var players = request.body.players;
            var queries = [];
            var params = [];
            var now = Date.now();
            players.forEach(function(idstring) {
                var otherplayerid = parseInt(idstring);
                if (isNaN(otherplayerid)) return;
                if (otherplayerid === playerid && !request.user.canselfquest) return;
                queries.push('insert into questavailability (quest, player, availablefrom) values (?, ?, ?);');
                params.push(questid);
                params.push(otherplayerid);
                params.push(now);
                // Benachrichrigung erstellen
                queries.push('insert into notification (targetplayer, type) values (?, 4);');
                params.push(otherplayerid);
            });
            if (queries.length > 0) {
                await db.query(queries.join(''), params);
            }
        }
        response.status(200).json({});
    });

    // Quest löschen, wenn ich der Ersteller bin
    router.post('/delete', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var playerid = request.user.id;
        var questid = request.body.id;
        var quests = await db.query('select id from quest where id = ? and creator = ?;', [ questid, playerid ]);
        if (quests.length < 1) return response.status(400).json({ error: 'quest not deletable' });
        await db.query('delete from quest where id = ?;', [ questid ]);
        await db.query('delete from questavailability where quest = ?', [ questid ]);
        await db.query('delete from playerquest where quest = ?', [ questid ]);
        response.status(200).json({});
    });

    // Questdetails zum Bearbeiten laden inkl. erlaubte Spieler
    router.post('/get', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var questid = request.body.id;
        var quests = await db.query('select id, topic, title, description, effort, type, creator from quest where id = ?;', [ questid ]);
        if (quests.length < 1) return response.status(400).json({ error: 'quest not found' });
        var quest = quests[0];
        var players = await db.query('select player from questavailability where quest = ?', [ questid ]);
        quest.players = players.map(function(player) { return player.player; });
        var completedplayers = await db.query('select player from playerquest where quest = ? and complete = 1 and validated = 0', [ questid ]);
        quest.completedplayers = completedplayers.map(function(player) { return player.player; });
        response.status(200).json(quest);
    });

    // Questdetails zum Starten der Quest für mich
    router.post('/getforme', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var questid = request.body.id;
        var playerid = request.user.id;
        var quests = await db.query('select quest.title, quest.description, quest.effort, (quest.creator = questavailability.player) ismyquest from quest join questavailability on questavailability.quest = quest.id where questavailability.player = ? and quest.id = ? and (quest.type = 99 or questavailability.availablefrom <= ?);', [ playerid, questid, Date.now() ]);
        if (quests.length < 1) return response.status(400).json({ error: 'quest not found' });
        response.status(200).json(quests[0]);
    });

    // Von mir erstellte Quests auflisten, inkl. Info, ob eine davon auf Validierung wartet
    router.post('/list', auth, async function(request, response) {
        var playerid = request.user.id;
        var quests;
        if (request.body.showinvisible) {
            quests = await db.query('select distinct quest.id, quest.topic, quest.title, quest.effort, (select count(*) from playerquest where complete = 1 and validated = 0 and quest = quest.id) complete, (select (case when count(*) > 0 then 1 else 0 end) from questavailability where quest = quest.id) assigned from quest where creator = ?;', [ playerid ]);
        } else {
            quests = await db.query('select distinct quest.id, quest.topic, quest.title, quest.effort, (select count(*) from playerquest where complete = 1 and validated = 0 and quest = quest.id) complete, 1 assigned from quest where (select count(*) from questavailability where quest = quest.id) > 0 and creator = ?;', [ playerid ]);
        }
        response.status(200).json(quests);
    });

    // Liste von Quests, die ich beginnen kann und für die für mich noch keine playerquests existieren
    router.post('/listnewforme', auth, async function(request, response) {
        var playerid = request.user.id;
        var quests = await db.query('select quest.id, quest.topic, quest.title, quest.effort from quest join questavailability on questavailability.quest = quest.id left join playerquest on (playerquest.quest = quest.id and playerquest.player = questavailability.player) where playerquest.id is null and questavailability.player = ? and (quest.type = 99 or questavailability.availablefrom <= ?);', [ playerid, Date.now() ]);
        response.status(200).json(quests);
    });

    // Quest speichern, wenn sie von mir stammt
    router.post('/save', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var questid = request.body.id;
        if (!request.body.title) return response.status(400).json({ error: 'title required' });
        if (!request.body.description) return response.status(400).json({ error: 'description required' });
        if (!request.body.effort) return response.status(400).json({ error: 'effort required' });
        if (!request.body.type) return response.status(400).json({ error: 'type required' });
        var effort = parseInt(request.body.effort);
        if (!effort) return response.status(400).json({ error: 'effort invalid' });
        var type = parseInt(request.body.type);
        if (types.indexOf(type) < 0) return response.status(400).json({ error: 'type invalid' });
        var topic = request.body.topic || "";
        if (topic.length > 255) topic = topic.subString(0, 255);
        var title = request.body.title;
        if (title.length > 255) title = title.subString(0, 255);
        var description = request.body.description;
        if (description.length > 65535) description = description.subString(0, 65535);
        var playerid = request.user.id;
        // Quest speichern
        await db.query('update quest set topic = ?, title = ?, description = ?, effort = ?, type = ? where id = ? and creator = ?;', [
            topic,
            title,
            description,
            effort,
            type,
            questid,
            playerid
        ]);
        // Verfügbarkeit speichern
        await db.query('delete from questavailability where quest = ?', [ questid ]);
        if (request.body.players && request.body.players.length) {
            var players = request.body.players;
            var queries = [];
            var params = [];
            var now = Date.now();
            players.forEach(function(idstring) {
                var otherplayerid = parseInt(idstring);
                if (isNaN(otherplayerid)) return;
                if (otherplayerid === playerid && !request.user.canselfquest) return;
                queries.push('insert into questavailability (quest, player, availablefrom) values (?, ?, ?);');
                params.push(questid);
                params.push(otherplayerid);
                params.push(now);
            });
            if (queries.length > 0) {
                await db.query(queries.join(''), params);
            }
        }
        response.status(200).json({});
    });

    // Gibt alle meine Themen für Themenliste zurück
    router.post('/topics', auth, async function(request, response) {
        var playerid = request.user.id;
        var quests = await db.query('select distinct topic from quest where creator = ? order by topic;', [ playerid ]);
        response.status(200).json(quests);
    });

    return router;
};