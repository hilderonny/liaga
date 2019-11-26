var db = require('../utils/db');
var auth = require('../utils/auth');

module.exports = function (router) {

    // Quest abbrechen
    router.post('/cancel', auth, async function(request, response) {
        if (!request.body.playerquestid) return response.status(400).json({ error: 'playerquestid required' });
        var playerquestid = request.body.playerquestid;
        var playerid = request.user.id;
        var playerquests = await db.query('select playerquest.id from playerquest join quest on playerquest.quest = quest.id join questavailability on questavailability.quest = quest.id where playerquest.id = ? and playerquest.player = ? and questavailability.player = ?', [ playerquestid, playerid, playerid ]);
        if (playerquests.length < 1) return response.status(400).json({ error: 'playerquests not found' });
        await db.query('delete from playerquest where id = ?', [ playerquestid ]);
        response.status(200).json({});
    });

    // Quest abschließen und validierbar machen. Es sei denn, es ist meine eigene Quest
    router.post('/complete', auth, async function(request, response) {
        if (!request.body.playerquestid) return response.status(400).json({ error: 'playerquestid required' });
        var playerquestid = request.body.playerquestid;
        var playerid = request.user.id;
        var playerquests = await db.query('select quest.creator from playerquest join quest on playerquest.quest = quest.id join questavailability on questavailability.quest = quest.id where playerquest.id = ? and playerquest.player = ? and questavailability.player = ?', [ playerquestid, playerid, playerid ]);
        if (playerquests.length < 1) return response.status(400).json({ error: 'playerquests not found' });
        if (playerquests[0].creator === playerid) { // Wenn es meine ist, dann gleich abschliessen
            await db.query('update playerquest set complete = 1, validated = 1, completedat = ? where id = ?', [ Date.now(), playerquestid ]);
        } else {
            await db.query('update playerquest set complete = 1, completedat = ? where id = ?', [ Date.now(), playerquestid ]);
        }
        response.status(200).json({});
    });

    // Liefert Details zu einer laufenden Quest für mich
    router.post('/get', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var playerquestid = request.body.id;
        var playerid = request.user.id;
        var playerquests = await db.query('select quest.title, quest.description, quest.effort, playerquest.complete, playerquest.validated from playerquest join quest on playerquest.quest = quest.id join questavailability on questavailability.quest = quest.id where playerquest.id = ? and questavailability.player = ?', [ playerquestid, playerid ]);
        if (playerquests.length < 1) return response.status(400).json({ error: 'playerquests not found' });
        response.status(200).json(playerquests[0]);
    });

    // Alle von mir laufenden Quests liefern
    router.post('/list', auth, async function (request, response) {
        var playerid = request.user.id;
        var playerquests = await db.query('select quest.topic, quest.title, quest.effort, playerquest.id, playerquest.complete, playerquest.validated from playerquest join quest on playerquest.quest = quest.id where playerquest.player = ?', [playerid]);
        response.status(200).json(playerquests);
    });

    // Belohnung für validierte Quest einfordern
    router.post('/reward', auth, async function(request, response) {
        if (!request.body.playerquestid) return response.status(400).json({ error: 'playerquestid required' });
        var playerquestid = request.body.playerquestid;
        var playerid = request.user.id;
        var playerquests = await db.query('select quest.id questid, quest.type, quest.effort from playerquest join quest on playerquest.quest = quest.id join questavailability on questavailability.quest = quest.id where playerquest.id = ? and playerquest.player = ? and questavailability.player = ?', [ playerquestid, playerid, playerid ]);
        if (playerquests.length < 1) return response.status(400).json({ error: 'playerquests not found' });
        var playerquest = playerquests[0];
        // Belohnung zum Spieler hinzufügen
        var player = request.user; // Von auth gesetzt
        var newep = player.ep + playerquest.effort;
        var newlevel = 1 + Math.floor(newep / 400);
        var newrubies = player.rubies + Math.round(playerquest.effort / 2);
        await db.query('update player set ep = ?, level = ?, rubies = ? where id = ?', [ newep, newlevel, newrubies, playerid ]);
        // Playerquest löschen
        await db.query('delete from playerquest where id = ?', [ playerquestid ]);
        // Verfügbarkeit der Quest für mich löschen, wenn es eine Einmalsache ist.
        if (playerquest.type === 0) {
            await db.query('delete from questavailability where player = ? and quest = ?', [ playerid, playerquest.questid ]);
        } else if (playerquest.type === 1) {
            // Täglich
            var tomorrow = Math.floor(Date.now() / 86400000) * 86400000 + 86400000;
            await db.query('update questavailability set availablefrom = ? where player = ? and quest = ?', [ tomorrow, playerid, playerquest.questid ])
        } else if (playerquest.type === 2) {
            // Wöchentlich
            var nextmonday = Math.floor(Date.now() / 604800000) * 604800000 + 950400000; // Der 1.1.1970 war ein Donnerstag, wir fangen aber montags an
            await db.query('update questavailability set availablefrom = ? where player = ? and quest = ?', [ nextmonday, playerid, playerquest.questid ])
        }
        response.status(200).json({});
    });

    // Beginnt eine Quest. Dazu existiert noch kein playerquest Eintrag
    router.post('/start', auth, async function (request, response) {
        if (!request.body.questid) return response.status(400).json({ error: 'questid required' });
        var questid = request.body.questid;
        var playerid = request.user.id;
        var quests = await db.query('select quest.id, quest.effort from quest join questavailability on questavailability.quest = quest.id where quest.id = ? and questavailability.player = ?', [ questid, playerid ]);
        if (quests.length < 1) return response.status(400).json({ error: 'quest not found' });
        var quest = quests[0];
        await db.query('insert into playerquest (player, quest, complete, validated, startedat, completedat) values (?, ?, ?, ?, ?, ?);', [
            playerid,
            questid,
            0, // complete
            0, // validated
            Date.now(), // startedat,
            null, // completedat
        ]);
        response.status(200).json({});
    });

    // Quest validieren
    router.post('/validate', auth, async function(request, response) {
        if (!request.body.questid) return response.status(400).json({ error: 'questid required' });
        if (!request.body.playerid) return response.status(400).json({ error: 'playerid required' });
        var questid = request.body.questid;
        var otherplayerid = request.body.playerid;
        var playerid = request.user.id;
        var playerquests = await db.query('select playerquest.id from playerquest join quest on quest.id = playerquest.quest where quest.id = ? and playerquest.player = ? and quest.creator = ?', [ questid, otherplayerid, playerid ]);
        if (playerquests.length < 1) return response.status(400).json({ error: 'playerquests not found' });
        await db.query('update playerquest set complete = 1, validated = 1 where id = ?', [ playerquests[0].id ]);
        response.status(200).json({});
    });

    return router;
};