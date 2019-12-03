var db = require('../utils/db');
var auth = require('../utils/auth');

module.exports = function(router) {

    // Alle Items auflisten, die ich in meinem Shop habe
    router.post('/list', auth, async function(request, response) {
        if (!request.user.hasshop) return response.status(400).json({ error: 'player has no shop' });
        var shopitems = await db.query('select id, iconurl, title, rubies from shopitem where creator = ?;', [request.user.id]);
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
    
    return router;
};