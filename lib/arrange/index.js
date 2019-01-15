const bcryptjs = require('bcryptjs');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const http = require('http');
const monk = require('monk');

class Server {

    /**
     * Server initialisieren.
     * @param {number} port Port, an dem der Server lauschen soll.
     * @param {string} dbUrl URL, an der die MongoDB erreichbar ist. Muss angegeben sein.
     * @param {boolean} useCors Gibt an, ob Server CORS-Anfragen erlauben soll.
     * @param {string} tokenSecret Passphrase, mit der der Auth-Token verschlüsselt wird.
     */
    constructor(port, dbUrl, useCors, tokenSecret) {
        let self = this;
        self.port = port;
        self.dbUrl = dbUrl;
        self.useCors = useCors;
        self.tokenSecret = tokenSecret;
        self.app = express();
        self.app.use(compression());
        if (self.useCors) self.app.use(cors());
        self.app.use(bodyParser.json());
        self.app.use(bodyParser.urlencoded({ extended: true }));
        // <script src="/arrange/arrange.js"></script>
        self.app.use('/arrange', express.static(__dirname + '/client'));
        // APIs registrieren
        self.app.post('/api/arrange/login', function(request, response) { return self.login(request, response); });
        self.app.post('/api/arrange/register', function(request, response) { return self.register(request, response); });
        // Server erstellen
        self.server = http.createServer(self.app);
    }

    /**
     * Middleware zur Benutzerauthentifizierung.
     * Liefert response 401, wenn Benutzer nicht authentifizierbar ist.
     * Verwendung: arrangeInstance.app.post('/api/myapi', arrangeInstance.auth, function(req, res) { ... });
     */
    auth(request, response, next) {
        let self = this;
        const token = request.header('x-access-token');
        if (!token) return response.status(401).json({ error: 'Token is missing' });
        jsonwebtoken.verify(token, self.tokenSecret, function(error, tokenUser) {
            if (error) return response.status(401).json({ error: 'Token cannot be validated' });
            self.db('users').findOne(tokenUser._id).then(function(user) {
                if (!user) return response.status(401).json({ error: 'User not found' });
                request.user = user;
                next();
            });
        });
    }

    /**
     * Liefert Zugriff auf eine bestimmte Datenbanktabelle
     */
    db(collectionName) {
        return monk(this.dbUrl).get(collectionName);
    }

    /**
     * API für Benutzer-Login.
     * Erwartet als Post-Parameter "username" und "password".
     */
    login(request, response) {
        let self = this;
        self.db('users').findOne({ name: request.body.username }, '_id username password').then(function(user) {
            if (user && bcryptjs.compareSync(request.body.password, user.password)) {
                delete user.password; // Das Passwort wird nicht zurück gegeben, nur _id und token.
                user.token = jsonwebtoken.sign({
                    _id: user._id,
                    time: Date.now()
                }, self.tokenSecret, {
                    expiresIn: '24h'
                });
                response.json(user);
            } else {
                response.status(403).json({ error: 'Login failed' });
            }
        });
    }

    /**
     * API für Benutzer-Registrierung.
     * Erwartet als Post-Parameter "username" und "password".
     */
    register(request, response) {
        let self = this;
        if (!request.body.password) return response.status(400).json({ error: 'Password required' });
        const collection = self.db('users');
        collection.findOne({ name: request.body.username }, '_id').then(function(existingUser) {
            if (existingUser) return response.status(400).send({ error: 'Username already taken' });
            collection.insert({ name: request.body.username, password: bcryptjs.hashSync(request.body.password) }).then(function(createdUser) {
                delete createdUser.password;
                createdUser.token = jsonwebtoken.sign({
                    _id: user._id,
                    time: Date.now()
                }, self.tokenSecret, {
                    expiresIn: '24h'
                });
                response.json(createdUser);
            });
        });
    }

    /**
     * Server starten
     */
    start() {
        const port = this.port;
        this.server.listen(port, function () {
            console.log('Arrange server running at port ' + port);
        });
    }

}

module.exports = {
    Server: Server
}
