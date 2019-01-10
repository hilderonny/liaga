const auth = require('./auth');
const bcryptjs = require('bcryptjs');
const jsonwebtoken = require('jsonwebtoken');
const db = require('./db');
const router = require('express').Router();

const secret = process.env.SECRET || 'sachichnich';

router.post('/login', function(request, response) {
    db('users').findOne({ name: request.body.username }, '_id password').then(function(user) {
        if (user && bcryptjs.compareSync(request.body.password, user.password)) {
            delete user.password;
            user.token = jsonwebtoken.sign({
                _id: user._id,
                time: Date.now()
            }, secret, {
                expiresIn: '24h'
            });
            response.json(user);
        } else {
            response.status(403).json({ error: 'Login failed' });
        }
    });
});

router.post('/register', function(request, response) {
    if (!request.body.password) return response.status(400).json({ error: 'Password required' });
    const collection = db('users');
    collection.findOne({ name: request.body.username }, '_id').then(function(existingUser) {
        if (existingUser) return response.status(400).send({ error: 'Username already taken' });
        collection.insert({ name: request.body.username, password: bcryptjs.hashSync(request.body.password) }).then(function(createdUser) {
            delete createdUser.password;
            createdUser.token = jsonwebtoken.sign({
                _id: user._id,
                time: Date.now()
            }, secret, {
                expiresIn: '24h'
            });
            response.json(createdUser);
        });
    });
});

router.post('/saveModel', auth, function(request, response) {
    const collection = db('models');
    if (request.body._id) {
        collection.findOneAndUpdate({ _id: request.body._id, _ownerId: request.user._id }, { $set: request.body }).then(function(updated) {
            response.json(updated);
        });
    } else {
        request.body._ownerId = request.user._id;
        collection.insert(request.body).then(function(inserted) {
            response.json(inserted);
        });
    }
});

module.exports = router;