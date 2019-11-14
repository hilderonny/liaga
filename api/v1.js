// In dieser Version werden HTTP Calls mit Polling eingesetzt.
// Sockets habe ich unter iOS nicht zum Laufen bekommen und Android machte ebenfalls Probleme.
var express = require('express');
var bcrypt = require('bcryptjs');
var fs = require('fs');
var jsonwebtoken = require('jsonwebtoken');

var router = express.Router();

console.log('Initialisiere API V3 unter /api/v3/');

// Privater Schlüssel für Token
var tokensecret = 'hubbelebubbele';

// Benutzer aus Datenbank laden
var usersfile = './data/users.json';
var users = JSON.parse(fs.readFileSync(usersfile));

/**
 * Middleware zur Benutzerauthentifizierung.
 * Liefert response 401, wenn Benutzer nicht authentifizierbar ist.
 * Schreibt request.user mit username.
 */
function auth(request, response, next) {
    var token = request.header('x-access-token');
    if (!token) return response.status(401).json({ error: 'Token is missing' });
    jsonwebtoken.verify(token, tokensecret, function (error, tokenUser) {
        if (error) return response.status(401).json({ error: 'Token cannot be validated' });
        var user = users.find(function (u) { return u.username === tokenUser.username; });
        if (!user) return response.status(401).json({ error: 'User not found' });
        request.user = user;
        next();
    });
}

// Benutzer speichern
function saveUsers() {
    // Objekte bereinigen, damit nicht irgendwelche temporären Daten (Nachrichten) serialisiert werden
    var userstosave = users.map(function (user) {
        return {
            username: user.username,
            password: user.password,
        };
    });
    fs.writeFileSync(usersfile, JSON.stringify(userstosave));
}

// Benutzername validieren, nur Zahlen und Buchstaben
function usernameIsValid(username) {
    return username && username.length && username.length > 0 && username.length < 255 && /^[a-z0-9]+$/i.test(username);
}

/**
 * Neuen Benutzer registrieren und automatisch anmelden.
 * Erforderliche Parameter:
 * - username : Eindeutiger Benutzername (max. 255 Zeichen), wird validiert. Fehler bei falschem Namen, zu lang, oder wenn bereits verwendet
 * - password : max. 255 Zeichen. Fehler wenn zu lang oder nicht angegeben.
 * Liefert 200 mit {token:"token"} bei Erfolg und 401 bei Fehler
 */
router.post('/register', function (request, response) {
    //console.log('/api/v3/register', JSON.stringify(request.body));
    var username = request.body.username;
    if (!usernameIsValid(username)) return response.status(401).json({ error: 'Username invalid' });
    if (users.find(function (user) { return user.username === username })) return response.status(401).json({ error: 'User already registered' });
    var password = request.body.password;
    if (!password || !password.length || password.length < 1 || password.length > 255) return response.status(401).json({ error: 'Password invalid' });
    // So, alles gut, Registrierung kann beginnen
    var user = {
        username: username,
        password: bcrypt.hashSync(password),
    };
    users.push(user);
    saveUsers();
    var token = jsonwebtoken.sign({
        username: username,
        time: Date.now()
    }, tokensecret, {
        expiresIn: '24h'
    });
    response.status(200).json({
        token: token,
    });
});

/**
 * Existierenden Benutzer anmelden
 * Erforderliche Parameter:
 * - username : Fehler wenn Name nicht vorhanden
 * - password : Fehler wenn nicht korrekt für email
 * Liefert 200 mit {token:"token"} bei Erfolg und 401 bei Fehler
 */
router.post('/login', function (request, response) {
    console.log('/api/v3/login', JSON.stringify(request.body));
    var username = request.body.username;
    if (!usernameIsValid(username)) return response.status(401).json({ error: 'Username invalid' });
    var user = users.find(function (u) { return u.username === username });
    if (!user) return response.status(401).json({ error: 'User not found' });
    var password = request.body.password;
    if (!bcrypt.compareSync(password, user.password)) return response.status(401).json({ error: 'Password invalid' });
    // So, alles gut, Anmeldung kann beginnen
    var token = jsonwebtoken.sign({
        username: username,
        time: Date.now()
    }, tokensecret, {
        expiresIn: '24h'
    });
    response.status(200).json({
        token: token,
    });
});

/**
 * Neues Passwort für Benutzer festlegen
 * Erforderliche Parameter:
 * - password : max. 255 Zeichen. Fehler wenn zu lang
 * - token : Anmeldetoken
 * Liefert 200 mit {token:"neuertoken"} bei Erfolg und 401 bei Fehler
 */
router.post('/setpassword', function (request, response) {
    //console.log('/api/v3/setpassword', JSON.stringify(request.body));
    auth(request, response, function () {
        var password = request.body.password;
        if (!password || !password.length || password.length < 1 || password.length > 255) return response.status(401).json({ error: 'Password invalid' });
        var user = request.user;
        user.password = bcrypt.hashSync(password);
        saveUsers();
        var token = jsonwebtoken.sign({
            username: username,
            time: Date.now()
        }, this.tokensecret, {
            expiresIn: '24h'
        });
        response.status(200).json({ token: token });
    });
});

/**
 * Löscht den gerade angemeldeten Benutzeraccount und meldet diesen auch ab.
 * Erforderliche Parameter:
 * - token : Anmeldetoken
 * Liefert 200  bei Erfolg und 401 bei Fehler
 */
router.post('/deleteaccount', function (request, response) {
    //console.log('/api/v3/deleteaccount', JSON.stringify(request.body));
    auth(request, response, function () {
        var user = request.user;
        var index = users.indexOf(user);
        if (index < 0) return response.status(401).json({ error: 'User not found' });
        users.splice(index, 1);
        saveUsers();
        response.sendStatus(200);
    });
});

module.exports = router;