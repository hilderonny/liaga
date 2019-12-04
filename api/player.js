var db = require('../utils/db');
var auth = require('../utils/auth');
var bcryptjs = require('bcryptjs');
var jsonwebtoken = require('jsonwebtoken');

module.exports = function(router) {

    var tokensecret = process.env.TOKENSECRET || 'mytokensecret';

    // Eigenschaften von mir selbst
    router.post('/getstats', auth, async function(request, response) {
        var stats = await db.query('select username, ep, rubies, level, avatarurl, canselfquest, hasshop, greeting from player where id = ?', [ request.user.id ]);
        response.status(200).json(stats[0]);
    });

    router.post('/login', async function(request, response) {
        if (!request.body.username) return response.status(400).json({ error: 'Username required' });
        if (!request.body.password) return response.status(400).json({ error: 'Password required' });
        var existingusers = await db.query('select id, username, password from player where username = ?;', [request.body.username]);
        if (existingusers.length < 1) return response.status(403).json({ error: 'Login failed' });
        var user = existingusers[0];
        if (!bcryptjs.compareSync(request.body.password, user.password)) return response.status(403).json({ error: 'Login failed' });
        var result = {
            id: user.id,
            token: jsonwebtoken.sign({
                id: user.id,
                time: Date.now()
            }, tokensecret, {
                expiresIn: '24h'
            }),
            username: user.username
        };
        response.json(result);
    });

    router.post('/register', async function(request, response) {
        if (!request.body.username) return response.status(400).json({ error: 'Username required' });
        if (!request.body.password) return response.status(400).json({ error: 'Password required' });
        var existingusers = await db.query('select username from player where username = ?;', [request.body.username]);
        if (existingusers.length > 0) return response.status(400).json({ error: 'Username already taken' });
        var insertresult = await db.query('insert into player (username, password, ep, level, rubies) values (?, ?, 0, 1, 0);', [
            request.body.username,
            bcryptjs.hashSync(request.body.password)
        ]);
        var id = insertresult.insertId;
        var createduser = {
            id: id,
            token: jsonwebtoken.sign({
                id: id,
                time: Date.now()
            }, tokensecret, {
                expiresIn: '24h'
            }),
            username: request.body.username
        };
        response.json(createduser);
    });

    router.post('/saveprofile', auth, async function(request, response) {
        var avatarurl = request.body.avatarurl;
        var greeting = request.body.greeting;
        var password = request.body.password;
        if (avatarurl) await db.query('update player set avatarurl = ? where id = ?;', [ avatarurl, request.user.id ]);
        if (greeting) await db.query('update player set greeting = ? where id = ?;', [ greeting, request.user.id ]);
        if (password) await db.query('update player set password = ? where id = ?;', [ bcryptjs.hashSync(request.body.password), request.user.id ]);
        response.status(200).json({});
    });

    return router;
};