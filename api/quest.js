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
        if (!request.body.minlevel) return response.status(400).json({ error: 'minlevel required' });
        if (!request.body.type) return response.status(400).json({ error: 'type required' });
        var effort = parseInt(request.body.effort);
        if (!effort) return response.status(400).json({ error: 'effort invalid' });
        var minlevel = parseInt(request.body.minlevel);
        if (isNaN(minlevel)) return response.status(400).json({ error: 'minlevel invalid' });
        var type = parseInt(request.body.type);
        if (types.indexOf(type) < 0) return response.status(400).json({ error: 'type invalid' });
        var title = request.body.title;
        if (title.length > 255) title = title.subString(0, 255);
        var description = request.body.description;
        if (description.length > 65535) description = description.subString(0, 65535);
        var playerid = request.user.id;
        // Quest erstellen
        var questresult = await db.query('insert into quest (title, description, effort, minlevel, type, creator) values (?, ?, ?, ?, ?, ?);', [
            title,
            description,
            effort,
            minlevel,
            type,
            playerid
        ]);
        // Ersteller selbst als erlaubten Durchführer definieren
        await db.query('insert into questavailability (quest, player) values (?, ?);', [ questresult.insertId, playerid ]);
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
        response.status(200).json({});
    });

    // Questdetails zum Bearbeiten laden
    router.post('/get', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var questid = request.body.id;
        var quests = await db.query('select id, title, description, effort, minlevel, type, creator from quest where id = ?;', [ questid ]);
        if (quests.length < 1) return response.status(400).json({ error: 'quest not found' });
        response.status(200).json(quests[0]);
    });

    // Von mir erstellte Quests auflisten
    router.post('/list', auth, async function(request, response) {
        var playerid = request.user.id;
        var quests = await db.query('select id, title, description, effort, type from quest where creator = ?;', [ playerid ]);
        response.status(200).json(quests);
    });

    // Quest speichern, wenn sie von mir stammt
    router.post('/save', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        if (!request.body.title) return response.status(400).json({ error: 'title required' });
        if (!request.body.description) return response.status(400).json({ error: 'description required' });
        if (!request.body.effort) return response.status(400).json({ error: 'effort required' });
        if (!request.body.minlevel) return response.status(400).json({ error: 'minlevel required' });
        if (!request.body.type) return response.status(400).json({ error: 'type required' });
        var effort = parseInt(request.body.effort);
        if (!effort) return response.status(400).json({ error: 'effort invalid' });
        var minlevel = parseInt(request.body.minlevel);
        if (isNaN(minlevel)) return response.status(400).json({ error: 'minlevel invalid' });
        var type = parseInt(request.body.type);
        if (types.indexOf(type) < 0) return response.status(400).json({ error: 'type invalid' });
        var title = request.body.title;
        if (title.length > 255) title = title.subString(0, 255);
        var description = request.body.description;
        if (description.length > 65535) description = description.subString(0, 65535);
        await db.query('update quest set title = ?, description = ?, effort = ?, minlevel = ?, type = ? where id = ? and creator = ?;', [
            title,
            description,
            effort,
            minlevel,
            type,
            request.body.id,
            request.user.id
        ]);
        response.status(200).json({});
    });

    return router;
};