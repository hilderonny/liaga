var db = require('../utils/db');
var auth = require('../utils/auth');

module.exports = function (router) {

    // Alle von mir durchführbaren und laufenden Quests liefern
    router.post('/list', auth, async function (request, response) {
        var playerid = request.user.id;
        var playerquests = await db.query('select quest.id questid, playerquest.id id, quest.title, quest.description, quest.effort, playerquest.startedat from questavailability join quest on questavailability.quest = quest.id left join playerquest on (playerquest.player = ? and playerquest.quest = quest.id) where questavailability.player = ?', [playerid, playerid]);
        response.status(200).json(playerquests);
    });

    /*
    // Liefert Details zu einer meiner Quests
    router.post('/get', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var playerquestid = request.body.id;
        var playerquests = await db.query('select quest.id id, quest.title, quest.effort, playerquest.startedat from playerquest join quest on playerquest.quest = quest.id where playerquest.id = ?', [ playerquestid ]);
        if (playerquests.length < 1) return response.status(400).json({ error: 'player quest not found' });
        response.status(200).json(playerquests[0]);
    });
    */

    // Beginnt eine Quest. Dazu existiert noch kein playerquest Eintrag
    router.post('/start', auth, async function (request, response) {
        if (!request.body.questid) return response.status(400).json({ error: 'questid required' });
        var questid = request.body.questid;
        var playerid = request.user.id;
        var quests = await db.query('select id from quest where id = ?', [ questid ]);
        if (quests.length < 1) return response.status(400).json({ error: 'quest not found' });
        var quest = quests[0];
        console.log(Date.now());
        await db.query('insert into playerquest (player, quest, epatstart, complete, rubiesatstart, validated, startedat, completedat) values (?, ?, ?, ?, ?, ?, ?, ?);', [
            playerid,
            questid,
            0, // epatstart
            0, // complete
            0, // rubiesatstart
            0, // validated
            Date.now(), // startedat,
            null, // completedat
        ]);
        response.status(200).json({});
    });

    return router;
};