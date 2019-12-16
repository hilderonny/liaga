var webpush = require('web-push');

/**
 * Helferlein für Hintergrundbenachrichtigungen auf Smartphones und so
 */
var pm = {
    playerendpoints: {}
};

pm.checkpublickey = function (playerid, publickey) {
    var playerentry = pm.playerendpoints[playerid];
    if (!playerentry) {
        playerentry = {};
        pm.playerendpoints[playerid] = playerentry;
    }
    var connection = playerentry[publickey];
    if (!connection) {
        var vapidkeys = webpush.generateVAPIDKeys();
        connection = { privatekey: vapidkeys.privateKey };
        playerentry[vapidkeys.publicKey] = connection;
        return vapidkeys.publicKey;
    } else {
        return publickey;
    }
}

pm.setendpoint = function (playerid, publickey, subscription) {
    var playerentry = pm.playerendpoints[playerid];
    if (!playerentry) return false;
    var connection = playerentry[publickey];
    if (!connection) return false;
    connection.subscription = subscription;
    return true;
}

pm.notifynewmessage = function (playerid, fromplayer, messagecontent) {
    var payload = {
        title: "Nachricht von " + fromplayer,
        options: {
            body: messagecontent.length < 255 ? messagecontent : messagecontent.substr(0, 255),
            icon: '/images/mail.png'
        }
    }
    notify(playerid, payload);
}

pm.notifynewquest = function (playerid, fromplayer) {
    var payload = {
        title: "Neue Quest verfügbar",
        options: {
            body: fromplayer + " hat eine neue Quest für Dich!",
            icon: '/icons/asteriskyellow.png'
        }
    }
    notify(playerid, payload);
}

pm.notifyquesttovalidate = function (playerid, fromplayer) {
    var payload = {
        title: "Quest abgeschlossen",
        options: {
            body: fromplayer + " hat eine Deiner Quests abgeschlossen!",
            icon: '/icons/questionyellow.png'
        }
    }
    notify(playerid, payload);
}

pm.notifyquestvalidated = function (playerid, fromplayer) {
    var payload = {
        title: "Quest validiert",
        options: {
            body: fromplayer + " hat eine Deiner Quests validiert!",
            icon: '/icons/questionyellow.png'
        }
    }
    notify(playerid, payload);
}

function notify(playerid, payload) {
    var playerentry = pm.playerendpoints[playerid];
    if (!playerentry) return;
    Object.keys(playerentry).forEach(function (publickey) {
        var connection = playerentry[publickey];
        if (!connection.subscription) return;
        var options = {
            vapidDetails: {
                subject: 'mailto:ronny.hildebrandt@levelupsoftware.de',
                publicKey: publickey,
                privateKey: connection.privatekey
            },
            TTL: 60
        };
        webpush.sendNotification(
            connection.subscription,
            JSON.stringify(payload),
            options
        );
    });
}

module.exports = pm;