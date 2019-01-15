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
        this.port = port;
        this.dbUrl = dbUrl;
        this.useCors = useCors;
        this.tokenSecret = tokenSecret;
        this.app = express();
        this.app.use(compression());
        if (this.useCors) this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use('/arrange', express.static(__dirname + './client'));
        // APIs registrieren
        this.app.post('/api/arrange/login', this.login);
        this.app.post('/api/arrange/register', this.register);
        // Server erstellen
        this.server = http.createServer(this.app);
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
        self.db('users').findOne({ name: request.body.username }, '_id password').then(function(user) {
            if (user && bcryptjs.compareSync(request.body.password, user.password)) {
                delete user.password;
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
