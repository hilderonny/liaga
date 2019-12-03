var App = (function () {

    var USERNAMEKEY = 'username';
    var PASSWORDKEY = 'password';

    var token;
    var playerid;
    var stats;

    var newquestsforplayer = [], playerquests = [], quests = [], friends = [], messages = [], shopitems = [];
    var collapsedtopics = JSON.parse(localStorage.getItem('collapsedtopics') || '{}');

    async function _post(url, data) {
        var response = await fetch(url, {
            method: "POST",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                "x-access-token": token,
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    var _log = console.log;



    async function _fetchfriends() {
        friends = await _post('/api/friend/list');
        friends.sort(function (a, b) { return a.username.localeCompare(b.username); });
        console.log('👪 friends', friends);
    }

    async function _fetchmessages() {
        messages = await _post('/api/message/list');
        console.log('✉ messages', messages);
    }

    async function _fetchnewquestsforplayer() {
        newquestsforplayer = await _post('/api/quest/listnewforme');
        console.log('🥅 newquestsforplayer', newquestsforplayer);
    }

    async function _fetchplayerquests() {
        playerquests = await _post('/api/playerquest/list');
        console.log('🥅 playerquests', playerquests);
    }

    async function _fetchquests(showinvisible) {
        quests = await _post('/api/quest/list', { showinvisible: showinvisible });
        quests.sort(function (a, b) { // Erst nach solchen mit Spielern, dann nach zu validierenden, dann nach Aufwand absteigend, dann Titel alphabetisch
            return (a.topic || "Sonstige").localeCompare(b.topic || "Sonstige") || b.assigned - a.assigned || b.complete - a.complete || b.effort - a.effort || a.title.localeCompare(b.title);
        });
        console.log('🧰 quests', quests);
    }

    async function _fetchshopitems() {
        shopitems = await _post('/api/shop/list');
        shopitems.sort(function (a, b) { return a.title.localeCompare(b.title); });
        console.log('🏪 shopitems', shopitems);
    }

    async function _fetchtopics() {
        topics = await _post('/api/quest/topics');
        document.getElementById("topics").innerHTML = topics.map(function (topic) { return topic.topic ? '<option value="' + topic.topic + '"/>' : ''; }).join('');
        console.log('🧰 topics', topics);
    }

    function _createrubieshtml(rubies) {
        var rubiestext = "";
        var redrubies = Math.floor(rubies / 10000);
        var bluerubies = Math.floor((rubies - redrubies * 10000) / 100);
        var greenrubies = rubies - redrubies * 10000 - bluerubies * 100;
        if (redrubies > 0) rubiestext += redrubies + '<span class="red"></span>';
        if (bluerubies > 0) rubiestext += bluerubies + '<span class="blue"></span>';
        rubiestext += greenrubies + '<span class="green"></span>';
        return rubiestext;
    }

    // Infos über mich laden und anzeigen
    async function _fetchstats() {
        stats = await _post('/api/player/getstats');
        var eppercent = (stats.ep - ((stats.level - 1) * 400)) / 4;
        if (stats.avatarurl) {
            document.querySelector('.card.loggedin .stats .avatar').style.background = 'url(' + stats.avatarurl + ') center/100%';
        } else {
            delete document.querySelector('.card.loggedin .stats .avatar').removeAttribute('style');
        }
        document.querySelector('.card.loggedin .stats .level').innerHTML = stats.level;
        document.querySelector('.card.loggedin .stats .name').innerHTML = stats.username;
        document.querySelector('.card.loggedin .stats .ep .bar').style.width = eppercent + "%";
        document.querySelector('.card.loggedin .stats .ep .text').innerHTML = "EP: " + stats.ep + " / " + (stats.level * 400);
        document.querySelector('.card.loggedin .stats .rubies').innerHTML = "Rubine: " + _createrubieshtml(stats.rubies);
        document.querySelector('.card.profile .title').innerHTML = stats.username;
        if (stats.hasshop) document.querySelector('.card.loggedin .tabbuttons .shop').style.display = "inline-block";
        console.log('🧑 stats', stats);
    }

    function _getorcreatetopicdiv(questlist, topicdivs, topic) {
        if (!topicdivs[topic]) {
            var topicdiv = document.createElement('div');
            topicdiv.topic = topic;
            topicdiv.classList.add('topic');
            var titlediv = document.createElement('div');
            titlediv.classList.add('title');
            titlediv.innerHTML = topic;
            if (collapsedtopics[topic]) topicdiv.classList.add('closed');
            titlediv.addEventListener('click', function () {
                topicdiv.classList.toggle('closed');
                if (topicdiv.classList.contains('closed')) {
                    collapsedtopics[topic] = 1;
                } else {
                    delete collapsedtopics[topic];
                }
                localStorage.setItem('collapsedtopics', JSON.stringify(collapsedtopics));
            });
            topicdiv.appendChild(titlediv);
            topicdivs[topic] = topicdiv;
            questlist.appendChild(topicdiv);
        }
        return topicdivs[topic];
    }

    async function _listfriends() {
        await _fetchfriends();
        var friendlist = document.querySelector('.card.loggedin .tab.friends .list');
        friendlist.innerHTML = "";
        friends.forEach(function (friend) {
            var node = document.createElement('div');
            if (friend.incoming) node.classList.add('incoming');
            if (friend.accepted) node.classList.add('accepted');
            if (!friend.incoming && !friend.accepted) node.classList.add('pending');
            var avatarstyle = friend.avatarurl ? 'style="background-image: url(./images/friend-frame.png), url(' + friend.avatarurl + ')"' : '';
            node.innerHTML = '<div class="avatar" ' + avatarstyle + '></div><div class="level">' + friend.level + '</div><div class="username">' + friend.username + '</div>';
            if (friend.accepted) {
                var messagebutton = document.createElement('button');
                messagebutton.innerHTML = "✉";
                messagebutton.addEventListener('click', function () {
                    _showcreatemessagecard(friend);
                });
                node.appendChild(messagebutton);
            }
            if (friend.incoming && !friend.accepted) {
                var acceptbutton = document.createElement('button');
                acceptbutton.innerHTML = "✔";
                acceptbutton.addEventListener('click', async function () {
                    await _post('/api/friend/accept', { id: friend.friendshipid });
                    _showloggedincard();
                    _showfriendstab();
                });
                node.appendChild(acceptbutton);
                var rejectbutton = document.createElement('button');
                rejectbutton.innerHTML = "❌";
                rejectbutton.addEventListener('click', async function () {
                    if (!confirm('Freundschaftsanfrage wirklich ablehnen?')) return;
                    await _post('/api/friend/reject', { id: friend.friendshipid });
                    _showloggedincard();
                    _showfriendstab();
                });
                node.appendChild(rejectbutton);
            } else {
                var deletebutton = document.createElement('button');
                deletebutton.innerHTML = "❌";
                deletebutton.addEventListener('click', async function () {
                    if (!confirm((!friend.incoming && !friend.accepted) ? 'Anfrage wirklich löschen?' : 'Freundschaft wirklich beenden?')) return;
                    await _post('/api/friend/delete', { id: friend.friendshipid });
                    _showloggedincard();
                    _showfriendstab();
                });
                node.appendChild(deletebutton);
            }
            friendlist.appendChild(node);
        });
    }

    async function _listmessages() {
        await _fetchfriends();
        await _fetchmessages();
        var messagelist = document.querySelector('.card.mailbox .list');
        messagelist.innerHTML = "";
        messages.forEach(function (message) {
            var node = document.createElement('div');
            if (message.isread) node.classList.add('isread');
            var friend = friends.find(function (f) { return f.friendid === message.fromplayer; });
            var avatarstyle = (friend && friend.avatarurl) ? 'style="background-image: url(./images/friend-frame.png), url(' + friend.avatarurl + ')"' : '';
            node.innerHTML = '<div class="avatar" ' + avatarstyle + '></div><div class="title">' + message.title + '</div><div class="text">' + message.content + '</div>';
            node.addEventListener('click', function () {
                _showmessagecard(message, friend);
            });
            messagelist.appendChild(node);
        });
    }

    async function _listshopitems() {
        await _fetchshopitems();
        var itemlist = document.querySelector('.card.loggedin .tab.shop .list');
        itemlist.innerHTML = "";
        shopitems.forEach(function (shopitem) {
            var node = document.createElement('div');
            node.innerHTML = '<div class="icon" style="background-image: url(./images/shop-item-border.png), url(' + shopitem.iconurl + ');"></div><div class="details"><div class="title">' + shopitem.title + '</div><div class="rubies">' + _createrubieshtml(shopitem.rubies) + '</div></div>';
            node.addEventListener('click', function () {
                _showshopitemcard(shopitem.id);
            });
            itemlist.appendChild(node);
        });
    }

    // Sortiert die Questliste nach Themen, Status, Schwierigkeit und  Bezeichnung
    function _sortquestlist(questlist) {
        // Themen sortieren
        var topiclist = Array.from(questlist.childNodes).sort(function (a, b) { return a.topic.localeCompare(b.topic); });
        // in den Themen die Quests sortieren
        topiclist.forEach(function (topicnode) {
            Array.from(topicnode.querySelectorAll('.quest')).sort(function (a, b) {
                return a.quest.isnew - b.quest.isnew || b.quest.validated - a.quest.validated || b.quest.complete - a.quest.complete || b.quest.effort - a.quest.effort || a.quest.title.localeCompare(b.quest.title);
            }).forEach(function (questnode) {
                topicnode.appendChild(questnode);
            });
            questlist.appendChild(topicnode);
        });
    }

    // Listet sowohl neue verfügbare Quests für mich als auch laufende Quests auf
    async function _listplayerquests() {
        await _fetchnewquestsforplayer();
        await _fetchplayerquests();
        var playerquestlist = document.querySelector('.card.loggedin .tab.playerquests .list');
        playerquestlist.innerHTML = "";
        var topicdivs = {};
        // Erst die bereits laufenden Quests
        playerquests.forEach(function (playerquest) {
            var node = document.createElement('div');
            node.quest = playerquest;
            playerquest.isnew = 0;
            node.classList.add('quest');
            node.classList.add('effort' + playerquest.effort);
            if (!playerquest.complete) node.classList.add('running');
            if (playerquest.complete && !playerquest.validated) node.classList.add('complete');
            if (playerquest.validated) node.classList.add('validated');
            node.addEventListener('click', function () {
                _showexistingplayerquestdetailscard(playerquest.id);
            });
            node.innerHTML = playerquest.title;
            _getorcreatetopicdiv(playerquestlist, topicdivs, playerquest.topic || "Sonstige").appendChild(node);
        });
        // Dann die neu verfügbaren Quests
        newquestsforplayer.forEach(function (newquest) {
            var node = document.createElement('div');
            node.quest = newquest;
            newquest.validated = 0;
            newquest.complete = 0;
            newquest.isnew = 1;
            node.classList.add('quest');
            node.classList.add('effort' + newquest.effort);
            node.classList.add('pending');
            node.addEventListener('click', function () {
                _shownewplayerquestdetailscard(newquest.id);
            });
            node.innerHTML = newquest.title;
            _getorcreatetopicdiv(playerquestlist, topicdivs, newquest.topic || "Sonstige").appendChild(node);
        });
        _sortquestlist(playerquestlist);
    }

    async function _listquests(showinvisible) {
        await _fetchquests(showinvisible);
        var questlist = document.querySelector('.card.loggedin .tab.quests .list');
        questlist.innerHTML = "";
        var topicdivs = {};
        quests.forEach(function (quest) {
            var node = document.createElement('div');
            node.classList.add('quest');
            if (quest.assigned > 0) {
                node.classList.add('effort' + quest.effort);
            } else {
                node.classList.add('invisible');
            }
            if (quest.complete) node.classList.add('complete');
            node.addEventListener('click', function () {
                _showeditquestcard(quest.id);
            });
            node.innerHTML = quest.title;
            _getorcreatetopicdiv(questlist, topicdivs, quest.topic || "Sonstige").appendChild(node);
        });
    }

    async function _login() {
        var errormessagediv = document.querySelector('.card.login .errormessage');
        errormessagediv.style.display = 'none';
        var username = document.querySelector('.card.login [name="username"]').value;
        var password = document.querySelector('.card.login [name="password"]').value;
        var result = await _post('/api/player/login', { username: username, password: password });
        if (result.id) {
            // Login succeeded
            playerid = result.id;
            token = result.token;
            _storeusercredentials(username, password);
            _showloggedincard();
            _showplayerqueststab();
            _checkfornotifications();
        }
        else {
            // Login failed
            errormessagediv.style.display = 'block';
            // Clear stored credentials on failure
            _storeusercredentials();
        }
    }

    async function _logout() {
        // Simply clear the local storage of user credentials
        _storeusercredentials();
        _showlogincard();
    }

    async function _register() {
        var errormessagediv = document.querySelector('.card.register .errormessage');
        errormessagediv.style.display = 'none';
        var username = document.querySelector('.card.register [name="username"]').value;
        var password1 = document.querySelector('.card.register [name="password1"]').value;
        var password2 = document.querySelector('.card.register [name="password2"]').value;
        if (password1 !== password2) {
            errormessagediv.style.display = 'block';
            return;
        }
        var result = await _post('/api/player/register', { username: username, password: password1 });
        if (result.id) {
            // Registration and login succeeded
            playerid = result.id;
            token = result.token;
            _storeusercredentials(username, password1);
            _showloggedincard();
            _showplayerqueststab();
            _checkfornotifications();
        } else {
            // Registrierung fehlgeschlagen
            errormessagediv.style.display = 'block';
        }
    }

    async function _showeditquestcard(id) {
        await _fetchfriends();
        await _fetchtopics();
        var quest = await _post('/api/quest/get', { id: id });
        console.log('🧰 quest', quest);
        var form = document.querySelector('.card.editquest form');
        document.querySelector('.card.editquest .savequest').onclick = async function () {
            await _post('/api/quest/save', {
                id: id,
                topic: document.querySelector('.card.editquest [name="topic"]').value,
                title: document.querySelector('.card.editquest [name="title"]').value,
                description: document.querySelector('.card.editquest [name="description"]').value,
                effort: document.querySelector('.card.editquest [name="effort"]').value,
                type: document.querySelector('.card.editquest [name="type"]').value,
                players: Array.from(document.querySelectorAll('.card.editquest .players input')).filter(function (a) { return a.checked; }).map(function (b) { return b.value; }),
            });
            _showloggedincard();
            _showqueststab();
        };
        document.querySelector('.card.editquest .deletequest').onclick = async function () {
            event.preventDefault();
            if (!confirm('Quest wirklich löschen?')) return false;
            await _post('/api/quest/delete', { id: id });
            _showloggedincard();
            _showqueststab();
            return false;
        };
        document.querySelector('.card.editquest [name="topic"]').value = quest.topic;
        document.querySelector('.card.editquest .title').innerHTML = quest.title;
        document.querySelector('.card.editquest [name="title"]').value = quest.title;
        document.querySelector('.card.editquest [name="description"]').value = quest.description;
        document.querySelector('.card.editquest [name="effort"]').value = quest.effort;
        document.querySelector('.card.editquest [name="type"]').value = quest.type;
        var playersdiv = document.querySelector('.card.editquest .players');
        var players = friends.filter(function (friend) { return friend.accepted; }).map(function (friend) { return { name: friend.username, id: friend.friendid }; });
        if (stats.canselfquest) players.unshift({ name: 'Ich', id: playerid });
        playersdiv.innerHTML = "";
        players.forEach(function (player) {
            var div = document.createElement('div');
            var label = document.createElement('label');
            label.innerHTML = '<input type="checkbox" name="players" value="' + player.id + '"' + (quest.players.indexOf(player.id) < 0 ? '' : ' checked') + ' /><span>' + player.name + '</span>';
            div.appendChild(label);
            if (quest.completedplayers.indexOf(player.id) >= 0) {
                var button = document.createElement('button');
                button.innerHTML = "Validieren";
                button.addEventListener('click', async function () {
                    await _validateplayerquest(id, player.id);
                    await _showeditquestcard(id);
                });
                div.appendChild(button);
            }
            playersdiv.appendChild(div);
        });
        document.body.setAttribute('class', 'editquest');
    }

    async function _showloggedincard() {
        await _fetchstats();
        document.body.setAttribute('class', 'loggedin');
    }

    function _showlogincard() {
        document.querySelector('.card.login .errormessage').style.display = 'none';
        document.body.setAttribute('class', 'login');
    }

    async function _showmailbox() {
        await _listmessages();
        document.querySelector('.card.loggedin .mail').classList.remove('newmail');
        document.body.setAttribute('class', 'mailbox');
    }

    async function _showmessagecard(message, friend) {
        if (friend && friend.avatarurl) {
            document.querySelector('.card.messagedetails .avatar').setAttribute('style', 'background-image: url(' + friend.avatarurl + ')');
        }
        document.querySelector('.card.messagedetails .title').innerHTML = message.title;
        document.querySelector('.card.messagedetails .description').innerHTML = message.content;
        var buttonrow = document.querySelector('.card.messagedetails .buttonrow.bottom');
        buttonrow.innerHTML = "";
        if (friend) {
            var replybutton = document.createElement('button');
            replybutton.innerHTML = "Antworten";
            replybutton.addEventListener('click', async function () {
                _showcreatemessagecard(friend);
            });
            buttonrow.appendChild(replybutton);
        }
        var spacer = document.createElement('div');
        spacer.classList.add('spacer');
        buttonrow.appendChild(spacer);
        var deletebutton = document.createElement('button');
        deletebutton.innerHTML = "Löschen";
        deletebutton.addEventListener('click', async function () {
            if (!confirm('Nachricht wirklich abbrechen?')) return;
            await _post('/api/message/delete', { id: message.id });
            _showmailbox();
        });
        buttonrow.appendChild(deletebutton);
        document.body.setAttribute('class', 'messagedetails');
        await _post('/api/message/markasread', { id: message.id });
        console.log('✉ message', message, friend);
    }

    function _showcreatemessagecard(friend) {
        document.querySelector('.card.createmessage .avatar').setAttribute('style', 'background-image: url(' + friend.avatarurl + ')');
        document.querySelector('.card.createmessage .toplayer').innerHTML = friend.username;
        document.querySelector('.card.createmessage [name="content"]').value = "";
        var buttonrow = document.querySelector('.card.createmessage .buttonrow.bottom');
        buttonrow.innerHTML = "";
        var sendbutton = document.createElement('button');
        sendbutton.innerHTML = "Absenden";
        sendbutton.addEventListener('click', async function () {
            var content = document.querySelector('.card.createmessage [name="content"]').value;
            await _post('/api/message/send', { to: friend.friendid, content: content });
            _showmailbox();
        });
        buttonrow.appendChild(sendbutton);
        document.body.setAttribute('class', 'createmessage');
    }

    function _showplayerquestdetails(playerquest) {
        var titlediv = document.querySelector('.card.playerquestdetails .content .title');
        titlediv.innerHTML = playerquest.title;
        titlediv.setAttribute('class', 'title effort' + playerquest.effort);
        document.querySelector('.card.playerquestdetails .description').innerHTML = playerquest.description;
        document.querySelector('.card.playerquestdetails .rewards .ep').innerHTML = playerquest.effort.toLocaleString();
        document.querySelector('.card.playerquestdetails .rewards .rubies').innerHTML = _createrubieshtml(Math.round(playerquest.effort / 2));
        console.log('🥅', playerquest);
    }

    async function _showexistingplayerquestdetailscard(playerquestid) {
        var playerquest = await _post('/api/playerquest/get', { id: playerquestid });
        _showplayerquestdetails(playerquest);
        var buttonrow = document.querySelector('.card.playerquestdetails .buttonrow.bottom');
        buttonrow.innerHTML = "";
        if (!playerquest.complete) {
            var completebutton = document.createElement('button');
            completebutton.innerHTML = "Abschließen";
            completebutton.addEventListener('click', async function () {
                await _post('/api/playerquest/complete', { playerquestid: playerquestid });
                _showexistingplayerquestdetailscard(playerquestid);
            });
            buttonrow.appendChild(completebutton);
        }
        if (playerquest.validated) {
            var rewardbutton = document.createElement('button');
            rewardbutton.innerHTML = "Belohnung abholen";
            rewardbutton.addEventListener('click', async function () {
                await _post('/api/playerquest/reward', { playerquestid: playerquestid });
                _showloggedincard();
                _showplayerqueststab();
            });
            buttonrow.appendChild(rewardbutton);
        }
        if (playerquest.ismyquest) {
            var editbutton = document.createElement('button');
            editbutton.innerHTML = "Bearbeiten";
            editbutton.addEventListener('click', async function () {
                _showeditquestcard(playerquest.quest);
            });
            buttonrow.appendChild(editbutton);
        }
        var spacer = document.createElement('div');
        spacer.classList.add('spacer');
        buttonrow.appendChild(spacer);
        var cancelbutton = document.createElement('button');
        cancelbutton.innerHTML = "Abbrechen";
        cancelbutton.addEventListener('click', async function () {
            if (!confirm('Quest wirklich abbrechen?')) return;
            await _post('/api/playerquest/cancel', { playerquestid: playerquestid });
            _showloggedincard();
            _showplayerqueststab();
        });
        buttonrow.appendChild(cancelbutton);
        document.body.setAttribute('class', 'playerquestdetails');
    }

    async function _shownewplayerquestdetailscard(questid) {
        var quest = await _post('/api/quest/getforme', { id: questid });
        _showplayerquestdetails(quest);
        var buttonrow = document.querySelector('.card.playerquestdetails .buttonrow.bottom');
        buttonrow.innerHTML = "";
        var startbutton = document.createElement('button');
        startbutton.innerHTML = "Beginnen";
        startbutton.addEventListener('click', async function () {
            var result = await _post('/api/playerquest/start', { questid: questid });
            _showexistingplayerquestdetailscard(result.id);
        });
        buttonrow.appendChild(startbutton);
        if (quest.ismyquest) {
            var editbutton = document.createElement('button');
            editbutton.innerHTML = "Bearbeiten";
            editbutton.addEventListener('click', async function () {
                _showeditquestcard(questid);
            });
            buttonrow.appendChild(editbutton);
        }
        document.body.setAttribute('class', 'playerquestdetails');
    }

    async function _showplayerqueststab() {
        await _listplayerquests();
        document.querySelector('.card.loggedin').setAttribute('class', 'card loggedin playerquests');
    }

    async function _showshoptab() {
        await _listshopitems();
        document.querySelector('.card.loggedin').setAttribute('class', 'card loggedin shop');
    }

    async function _showqueststab() {
        await _listquests(false);
        document.querySelector('.card.loggedin').setAttribute('class', 'card loggedin quests');
    }

    async function _showfriendstab() {
        await _listfriends();
        document.querySelector('.card.loggedin').setAttribute('class', 'card loggedin friends');
    }

    async function _setpassword() {
        event.preventDefault();
        var password = event.target.password.value;
        var result = await _post('/api/player/setpassword', { password: password });
        if (result === undefined) {
            // Update succeeded
            _storeusercredentials(localStorage.getItem(USERNAMEKEY), password);
        }
        _log(result);
    }

    // Store username and password after successful login for future auto login
    // Call without parameters to clear the storage after logout
    function _storeusercredentials(username, password) {
        if (!username) localStorage.removeItem(USERNAMEKEY);
        else localStorage.setItem(USERNAMEKEY, username);
        if (!password) localStorage.removeItem(PASSWORDKEY);
        else localStorage.setItem(PASSWORDKEY, password);
    }

    // Tries to login with the credentials stored in local memory.
    // Returns true on success, false otherwise.
    async function _tryautologin() {
        var username = localStorage.getItem(USERNAMEKEY);
        var password = localStorage.getItem(PASSWORDKEY);
        if (!username || !password) {
            _log("No username or password stored");
            _showlogincard();
            return;
        }
        var result = await _post('/api/player/login', { username: username, password: password });
        if (!result.id) {
            // Clear stored credentials on failure
            _storeusercredentials();
            _showlogincard();
        }
        playerid = result.id;
        token = result.token;
        _showloggedincard();
        _showplayerqueststab();
        _checkfornotifications();
    }

    function _updateprofileavatarimage() {
        var url = document.querySelector('.card.profile [name="avatarurl"]').value;
        document.querySelector('.card.profile .avatarimage').style.background = 'url(./images/friend-frame.png) center/auto border-box, url(' + url + ') center/contain content-box';
    }

    function _updateshopitemimage(selector) {
        var url = document.querySelector('.card.' + selector + ' [name="iconurl"]').value;
        document.querySelector('.card.' + selector + ' .shopiconimage').style.background = 'url(./images/friend-frame.png) center/auto border-box, url(' + url + ') center/contain content-box';
    }

    async function _validateplayerquest(questid, playerid) {
        await _post('/api/playerquest/validate', { questid: questid, playerid: playerid });
    }

    async function _checkfornotifications() {
        if (!playerid) return; // Nicht angemeldet
        var notifications = await _post('/api/notification/fetch');
        if (!notifications) return;
        for (var i = 0; i < notifications.length; i++) {
            var notification = notifications[i];
            switch (notification) {
                // Neue Nachrichten eingetroffen
                case "0": _listmessages(); document.querySelector('.card.loggedin .mail').classList.add('newmail'); break;
                case "1": _listfriends(); break;
                case "2": _listfriends(); break;
                case "3": _listfriends(); break;
                case "4": _listplayerquests(); break;
                case "5": _listplayerquests(); break;
                case "6": _listquests(); break;
            }
        }
        console.log('ℹ notifications', notifications);
    }

    window.addEventListener('load', function () {
        _tryautologin();
        // Zyklisch nach Benachrichtigungen gucken
        setInterval(_checkfornotifications, 15000);
    });

    return {
        addfriend: async function () {
            var result = await _post('/api/friend/add', {
                username: document.querySelector('.card.addfriend [name="username"]').value,
            });
            if (result.error) {
                alert(result.error);
                return false;
            }
            _showloggedincard();
            _showfriendstab();
        },
        addshopitem: async function () {
            await _post('/api/shop/add', {
                title: document.querySelector('.card.addshopitem [name="title"]').value,
                description: document.querySelector('.card.addshopitem [name="description"]').value,
                rubies: document.querySelector('.card.addshopitem [name="rubies"]').value,
                iconurl: document.querySelector('.card.addshopitem [name="iconurl"]').value
            });
            _showloggedincard();
            _showshoptab();
        },
        addquest: async function () {
            await _post('/api/quest/add', {
                topic: document.querySelector('.card.addquest [name="topic"]').value,
                title: document.querySelector('.card.addquest [name="title"]').value,
                description: document.querySelector('.card.addquest [name="description"]').value,
                effort: document.querySelector('.card.addquest [name="effort"]').value,
                type: document.querySelector('.card.addquest [name="type"]').value,
                players: Array.from(document.querySelectorAll('.card.addquest .players input')).filter(function (a) { return a.checked; }).map(function (b) { return b.value; }),
            });
            _showloggedincard();
            _showqueststab();
        },
        log: _log,
        login: _login,
        logout: _logout,
        register: _register,
        saveprofile: async function () {
            var errormessagediv = document.querySelector('.card.profile .errormessage');
            errormessagediv.style.display = 'none';
            var avatarurl = document.querySelector('.card.profile [name="avatarurl"]').value;
            var password1 = document.querySelector('.card.profile [name="password1"]').value;
            var password2 = document.querySelector('.card.profile [name="password2"]').value;
            if ((password1 || password2) && password1 !== password2) {
                errormessagediv.style.display = 'block';
                return;
            }
            var data = { avatarurl: avatarurl };
            if (password1) data.password = password1;
            await _post('/api/player/saveprofile', data);
            if (password1) _storeusercredentials(stats.username, password1);
            _showloggedincard();
            _showplayerqueststab();
            _fetchstats();
        },
        setpassword: _setpassword,
        showaddfriendcard: async function () {
            document.querySelector('.card.addfriend [name="username"]').value = "";
            document.body.setAttribute('class', 'addfriend');
        },
        showaddshopitemcard: async function () {
            document.querySelector('.card.addshopitem [name="iconurl"]').value = "";
            document.querySelector('.card.addshopitem [name="title"]').value = "";
            document.querySelector('.card.addshopitem [name="description"]').value = "";
            document.querySelector('.card.addshopitem [name="rubies"]').value = 1;
            document.body.setAttribute('class', 'addshopitem');
            document.querySelector('.card.addshopitem [name="iconurl"]').addEventListener('paste', function (e) {
                // Von https://stackoverflow.com/questions/28644340/how-do-i-get-base64-encoded-image-from-clipboard-in-internet-explorer
                // Zum reinkopieren von Bildern
                for (var i = 0; i < e.clipboardData.items.length; i++) {
                    if (e.clipboardData.items[i].kind == "file" && e.clipboardData.items[i].type == "image/png") {
                        var imageFile = e.clipboardData.items[i].getAsFile();
                        var fileReader = new FileReader();
                        fileReader.onloadend = function () {
                            console.log(fileReader.result);
                            document.querySelector('.card.addshopitem [name="iconurl"]').value = fileReader.result;
                            _updateshopitemimage('addshopitem');
                        }
                        fileReader.readAsDataURL(imageFile);
                        break;
                    }
                }
            });
        },
        showaddquestcard: async function () {
            await _fetchfriends();
            await _fetchtopics();
            document.querySelector('.card.addquest [name="topic"]').value = "";
            document.querySelector('.card.addquest [name="title"]').value = "";
            document.querySelector('.card.addquest [name="description"]').value = "";
            document.querySelector('.card.addquest [name="effort"]').value = 5;
            document.querySelector('.card.addquest [name="type"]').value = 0;
            var playersdiv = document.querySelector('.card.addquest .players');
            var players = friends.filter(function (friend) { return friend.accepted; }).map(function (friend) { return { name: friend.username, id: friend.friendid }; });
            if (stats.canselfquest) players.unshift({ name: 'Ich', id: playerid });
            playersdiv.innerHTML = players.map(function (player) {
                return '<label><input type="checkbox" name="players" value="' + player.id + '" /><span>' + player.name + '</span></label>';
            }).join('');
            document.body.setAttribute('class', 'addquest');
        },
        showinvisiblequests: async function (showinvisible) {
            await _listquests(showinvisible);
            var card = document.querySelector('.card.quests');
            if (showinvisible) card.classList.add('showinvisible');
            else card.classList.remove('showinvisible');
        },
        showloggedincard: _showloggedincard,
        showlogincard: _showlogincard,
        showmailbox: _showmailbox,
        showplayerqueststab: _showplayerqueststab,
        showprofilecard: function () {
            document.querySelector('.card.profile [name="avatarurl"]').value = stats.avatarurl;
            document.querySelector('.card.profile [name="password1"]').value = "";
            document.querySelector('.card.profile [name="password2"]').value = "";
            _updateprofileavatarimage();
            document.querySelector('.card.profile .errormessage').style.display = 'none';
            document.body.setAttribute('class', 'profile');
        },
        showregistercard: function () {
            document.querySelector('.card.register .errormessage').style.display = 'none';
            document.body.setAttribute('class', 'register');
        },
        showshoptab: _showshoptab,
        showqueststab: _showqueststab,
        showfriendstab: _showfriendstab,
        updateprofileavatarimage: _updateprofileavatarimage,
        updateshopitemimage: _updateshopitemimage
    };
})();

// Service worker einbinden. Dieser muss im Stammverzeichnis der App in der Datei "serviceworker.js"
// enthalten sein.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        var serviceWorkerFile = 'serviceworker.js';
        console.log('%c🧰 load: Registriere service worker aus Datei ' + serviceWorkerFile, 'color:yellow');
        navigator.serviceWorker.register(serviceWorkerFile);
    });
}
