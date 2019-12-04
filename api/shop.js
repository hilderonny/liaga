var db = require('../utils/db');
var auth = require('../utils/auth');

module.exports = function(router) {

    // Alle Items auflisten, die ich in meinem Shop habe
    router.post('/list', auth, async function(request, response) {
        if (!request.user.hasshop) return response.status(400).json({ error: 'player has no shop' });
        var shopitems = await db.query('select id, iconurl, title, rubies from shopitem where creator = ?;', [request.user.id]);
        response.status(200).json(shopitems);
    });

    // Alle Items auflisten, die ein Freund für mich verfügbar hat
    router.post('/listfriend', auth, async function(request, response) {
        if (!request.body.friendid) return response.status(400).json({ error: 'friendid required' });
        var friendid = request.body.friendid;
        var playerid = request.user.id;
        var shopitems = await db.query('select id, iconurl, title, rubies from shopitem join (select ? playerid from friendship where accepted = 1 and ((initiator = ? and other = ?) or (initiator = ? and other = ?))) f on f.playerid = shopitem.creator;', [ friendid, playerid, friendid, friendid, playerid ]);
        response.status(200).json(shopitems);
    });

    // Shop Item erstellen
    router.post('/add', auth, async function(request, response) {
        if (!request.user.hasshop) return response.status(400).json({ error: 'player has no shop' });
        if (!request.body.title) return response.status(400).json({ error: 'title required' });
        if (!request.body.description) return response.status(400).json({ error: 'description required' });
        if (!request.body.rubies) return response.status(400).json({ error: 'rubies required' });
        if (!request.body.iconurl) return response.status(400).json({ error: 'iconurl required' });
        var rubies = parseInt(request.body.rubies);
        if (!rubies) return response.status(400).json({ error: 'rubies invalid' });
        var title = request.body.title;
        if (title.length > 255) title = title.subString(0, 255);
        var description = request.body.description;
        if (description.length > 65535) description = description.subString(0, 65535);
        var iconurl = request.body.iconurl;
        if (iconurl.length > 65535) return response.status(400).json({ error: 'iconurl too long' });
        // Quest erstellen
        await db.query('insert into shopitem (creator, title, description, rubies, type, iconurl) values (?, ?, ?, ?, 0, ?);', [
            request.user.id,
            title,
            description,
            rubies,
            iconurl
        ]);
        response.status(200).json({});
    });

    // Item löschen, wenn ich der Ersteller bin
    router.post('/delete', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var playerid = request.user.id;
        var itemid = request.body.id;
        var items = await db.query('select id from shopitem where id = ? and creator = ?;', [ itemid, playerid ]);
        if (items.length < 1) return response.status(400).json({ error: 'shop item not deletable' });
        await db.query('delete from shopitem where id = ?;', [ itemid ]);
        response.status(200).json({});
    });

    // Itemdetails zum Bearbeiten laden
    router.post('/get', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var itemid = request.body.id;
        var items = await db.query('select id, iconurl, title, description, rubies from shopitem where id = ?;', [ itemid ]);
        if (items.length < 1) return response.status(400).json({ error: 'shop item not found' });
        var item = items[0];
        response.status(200).json(item);
    });

    // Shop item speichern, wenn es von mir stammt
    router.post('/save', auth, async function(request, response) {
        if (!request.body.id) return response.status(400).json({ error: 'id required' });
        var itemid = request.body.id;
        if (!request.body.title) return response.status(400).json({ error: 'title required' });
        if (!request.body.description) return response.status(400).json({ error: 'description required' });
        if (!request.body.rubies) return response.status(400).json({ error: 'rubies required' });
        if (!request.body.iconurl) return response.status(400).json({ error: 'iconurl required' });
        var rubies = parseInt(request.body.rubies);
        if (!rubies) return response.status(400).json({ error: 'rubies invalid' });
        var title = request.body.title;
        if (title.length > 255) title = title.subString(0, 255);
        var description = request.body.description;
        if (description.length > 65535) description = description.subString(0, 65535);
        var iconurl = request.body.iconurl;
        if (iconurl.length > 65535) return response.status(400).json({ error: 'iconurl too long' });
        // Item speichern
        await db.query('update shopitem set title = ?, description = ?, rubies = ?, iconurl = ? where id = ? and creator = ?;', [
            title,
            description,
            rubies,
            iconurl,
            request.body.id,
            request.user.id
        ]);
        response.status(200).json({});
    });
    
    return router;
};