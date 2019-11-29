var App = (function() {

    var USERNAMEKEY = 'username';
    var PASSWORDKEY = 'password';

    var token;
    var playerid;
    var stats;

    var newquestsforplayer = [], playerquests = [], quests = [], friends = [];

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
        friends.sort(function(a, b) { return a.username.localeCompare(b.username); });
        console.log('👪 friends', friends);
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
        quests.sort(function(a, b) { // Erst nach solchen mit Spielern, dann nach zu validierenden, dann nach Aufwand absteigend, dann Titel alphabetisch
            return b.assigned - a.assigned || b.complete - a.complete || b.effort - a.effort || a.title.localeCompare(b.title);
        });
        console.log('🧰 quests', quests);
    }

    async function _fetchtopics() {
        topics = await _post('/api/quest/topics');
        document.getElementById("topics").innerHTML = topics.map(function(topic) { return topic.topic ? '<option value="' + topic.topic + '"/>' : ''; }).join('');
        console.log('🧰 topics', topics);
    }

    function _createrubieshtml(rubies) {
        var rubiestext = "";
        var redrubies = Math.floor(rubies / 10000);
        var bluerubies = Math.floor((rubies - redrubies) / 100);
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
        console.log(eppercent);
        document.querySelector('.card.loggedin .stats .level').innerHTML = stats.level;
        document.querySelector('.card.loggedin .stats .name').innerHTML = stats.username;
        document.querySelector('.card.loggedin .stats .ep .bar').style.width = eppercent + "%";
        document.querySelector('.card.loggedin .stats .ep .text').innerHTML = "EP: " + stats.ep + " / " + (stats.level * 400);
        document.querySelector('.card.loggedin .stats .rubies').innerHTML = "Rubine: " + _createrubieshtml(stats.rubies);
        console.log('🧑 stats', stats);
    }

    function _getorcreatetopicdiv(questlist, topicdivs, topic) {
        if (!topicdivs[topic]) {
            var topicdiv = document.createElement('div');
            topicdiv.classList.add('topic');
            var titlediv = document.createElement('div');
            titlediv.classList.add('title');
            titlediv.innerHTML = topic;
            titlediv.addEventListener('click', function() {
                topicdiv.classList.toggle('closed');
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
        friends.forEach(function(friend) {
            var node = document.createElement('div');
            if (friend.incoming) node.classList.add('incoming');
            if (friend.accepted) node.classList.add('accepted');
            if (!friend.incoming && !friend.accepted) node.classList.add('pending');
            node.innerHTML = '<div class="avatar"></div><div class="level">' + friend.level + '</div><div class="username">' + friend.username + '</div>';
            if (friend.incoming && !friend.accepted) {
                var acceptbutton = document.createElement('button');
                acceptbutton.innerHTML = "Anfrage annehmen";
                acceptbutton.addEventListener('click', async function() {
                    await _post('/api/friend/accept', { id: friend.friendshipid });
                    _showloggedincard();
                    _showfriendstab();
                });
                node.appendChild(acceptbutton);
                var rejectbutton = document.createElement('button');
                rejectbutton.innerHTML = "Anfrage ablehnen";
                rejectbutton.addEventListener('click', async function() {
                    if (!confirm('Freundschaftsanfrage wirklich ablehnen?')) return;
                    await _post('/api/friend/reject', { id: friend.friendshipid });
                    _showloggedincard();
                    _showfriendstab();
                });
                node.appendChild(rejectbutton);
            } else {
                var deletebutton = document.createElement('button');
                deletebutton.innerHTML = (!friend.incoming && !friend.accepted) ? "Anfrage löschen" : "Freundschaft beenden";
                deletebutton.addEventListener('click', async function() {
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

    // Listet sowohl neue verfügbare Quests für mich als auch laufende Quests auf
    async function _listplayerquests() {
        await _fetchnewquestsforplayer();
        await _fetchplayerquests();
        var playerquestlist = document.querySelector('.card.loggedin .tab.playerquests .list');
        playerquestlist.innerHTML = "";
        var topicdivs = {};
        // Erst die bereits laufenden Quests
        playerquests.forEach(function(playerquest) {
            var node = document.createElement('div');
            node.classList.add('quest');
            node.classList.add('effort' + playerquest.effort);
            if (!playerquest.complete) node.classList.add('running');
            if (playerquest.complete && !playerquest.validated) node.classList.add('complete');
            if (playerquest.validated) node.classList.add('validated');
            node.addEventListener('click', function() {
                _showexistingplayerquestdetailscard(playerquest.id);
            });
            node.innerHTML = playerquest.title;
            _getorcreatetopicdiv(playerquestlist, topicdivs, playerquest.topic || "Sonstige").appendChild(node);
        });
        // Dann die neu verfügbaren Quests
        newquestsforplayer.forEach(function(newquest) {
            var node = document.createElement('div');
            node.classList.add('quest');
            node.classList.add('effort' + newquest.effort);
            node.classList.add('pending');
            node.addEventListener('click', function() {
                _shownewplayerquestdetailscard(newquest.id);
            });
            node.innerHTML = newquest.title;
            _getorcreatetopicdiv(playerquestlist, topicdivs, newquest.topic || "Sonstige").appendChild(node);
        });
    }

    async function _listquests(showinvisible) {
        await _fetchquests(showinvisible);
        var questlist = document.querySelector('.card.loggedin .tab.quests .list');
        questlist.innerHTML = "";
        var topicdivs = {};
        quests.forEach(function(quest) {
            var node = document.createElement('div');
            node.classList.add('quest');
            if (quest.assigned > 0) {
                node.classList.add('effort' + quest.effort);
            } else {
                node.classList.add('invisible');
            }
            if (quest.complete) node.classList.add('complete');
            node.addEventListener('click', function() {
                _showeditquestcard(quest.id);
            });
            node.innerHTML = quest.title;
            _getorcreatetopicdiv(questlist, topicdivs, quest.topic || "Sonstige" ).appendChild(node);
        });
    }

    async function _login() {
        event.preventDefault();
        var errormessagediv = document.querySelector('.card.login .errormessage');
        errormessagediv.style.display = 'none';
        var username = event.target.username.value;
        var password = event.target.password.value;
        var result = await _post('/api/player/login', { username: username, password: password });
        if (result.id) {
            // Login succeeded
            playerid = result.id;
            token = result.token;
            _storeusercredentials(username, password);
            _showloggedincard();
            _showplayerqueststab();
        }
        else  {
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
        event.preventDefault();
        var errormessagediv = document.querySelector('.card.register .errormessage');
        errormessagediv.style.display = 'none';
        var username = event.target.username.value;
        var password1 = event.target.password1.value;
        var password2 = event.target.password2.value;
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
        document.querySelector('.card.editquest .savequest').onclick = async function() {
            await _post('/api/quest/save', {
                id: id,
                topic: document.querySelector('.card.editquest [name="topic"]').value,
                title: document.querySelector('.card.editquest [name="title"]').value,
                description: document.querySelector('.card.editquest [name="description"]').value,
                effort: document.querySelector('.card.editquest [name="effort"]').value,
                type: document.querySelector('.card.editquest [name="type"]').value,
                players: Array.from(document.querySelectorAll('.card.editquest .players input')).filter(function(a) { return a.checked; }).map(function(b) { return b.value; }),
            });
            _showloggedincard();
            _showqueststab();
        };
        document.querySelector('.card.editquest .deletequest').onclick = async function() {
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
        var players = friends.filter(function(friend) { return friend.accepted; }).map(function(friend) { return { name: friend.username, id: friend.friendid }; });
        players.unshift({ name: 'Ich', id: playerid });
        playersdiv.innerHTML = "";
        players.forEach(function(player) {
            var div = document.createElement('div');
            var label = document.createElement('label');
            label.innerHTML = '<input type="checkbox" name="players" value="' + player.id + '"' + (quest.players.indexOf(player.id) < 0 ? '' : ' checked') +  ' /><span>' + player.name + '</span>';
            div.appendChild(label);
            if (quest.completedplayers.indexOf(player.id) >= 0) {
                var button = document.createElement('button');
                button.innerHTML = "Validieren";
                button.addEventListener('click', async function() {
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

    function _escapehtml(text) {
        return text.replace(/\&/g, '&amp;').replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/\n/g, '<br/>');
    }

    function _showplayerquestdetails(playerquest) {
        var efforts = { 5: "Trivial", 30: "Einfach", 60: "Mittel", 240: "Schwer", 1440: "Episch" };
        var titlediv = document.querySelector('.card.playerquestdetails .content .title');
        titlediv.innerHTML = _escapehtml(playerquest.title);
        titlediv.setAttribute('class', 'title effort' + playerquest.effort);
        document.querySelector('.card.playerquestdetails .description').innerHTML = _escapehtml(playerquest.description);
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
            completebutton.addEventListener('click', async function() {
                await _post('/api/playerquest/complete', { playerquestid: playerquestid });
                _showexistingplayerquestdetailscard(playerquestid);
            });
            buttonrow.appendChild(completebutton);
        }
        if (playerquest.validated) {
            var rewardbutton = document.createElement('button');
            rewardbutton.innerHTML = "Belohnung abholen";
            rewardbutton.addEventListener('click', async function() {
                await _post('/api/playerquest/reward', { playerquestid: playerquestid });
                _showloggedincard();
                _showplayerqueststab();
            });
            buttonrow.appendChild(rewardbutton);
        }
        if (playerquest.ismyquest) {
            var editbutton = document.createElement('button');
            editbutton.innerHTML = "Bearbeiten";
            editbutton.addEventListener('click', async function() {
                _showeditquestcard(playerquest.quest);
            });
            buttonrow.appendChild(editbutton);
        }
        var spacer = document.createElement('div');
        spacer.classList.add('spacer');
        buttonrow.appendChild(spacer);
        var cancelbutton = document.createElement('button');
        cancelbutton.innerHTML = "Abbrechen";
        cancelbutton.addEventListener('click', async function() {
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
        startbutton.addEventListener('click', async function() {
            var result = await _post('/api/playerquest/start', { questid: questid });
            _showexistingplayerquestdetailscard(result.id);
        });
        buttonrow.appendChild(startbutton);
        if (quest.ismyquest) {
            var editbutton = document.createElement('button');
            editbutton.innerHTML = "Bearbeiten";
            editbutton.addEventListener('click', async function() {
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
    }

    async function _validateplayerquest(questid, playerid) {
        await _post('/api/playerquest/validate', { questid: questid, playerid: playerid });
    }

    window.addEventListener('load', function() {
        _tryautologin();
    });

    return {
        addfriend: async function() {
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
        addquest: async function() {
            await _post('/api/quest/add', {
                topic: document.querySelector('.card.addquest [name="topic"]').value,
                title: document.querySelector('.card.addquest [name="title"]').value,
                description: document.querySelector('.card.addquest [name="description"]').value,
                effort: document.querySelector('.card.addquest [name="effort"]').value,
                type: document.querySelector('.card.addquest [name="type"]').value,
                players: Array.from(document.querySelectorAll('.card.addquest .players input')).filter(function(a) { return a.checked; }).map(function(b) { return b.value; }),
            });
            _showloggedincard();
            _showqueststab();
        },
        log: _log,
        login: _login,
        logout: _logout,
        register: _register,
        setpassword: _setpassword,
        showaddfriendcard: async function() {
            document.querySelector('.card.addfriend [name="username"]').value = "";
            document.body.setAttribute('class', 'addfriend');
        },
        showaddquestcard: async function() {
            await _fetchfriends();
            await _fetchtopics();
            document.querySelector('.card.addquest [name="topic"]').value = "";
            document.querySelector('.card.addquest [name="title"]').value = "";
            document.querySelector('.card.addquest [name="description"]').value = "";
            document.querySelector('.card.addquest [name="effort"]').value = 5;
            document.querySelector('.card.addquest [name="type"]').value = 0;
            var playersdiv = document.querySelector('.card.addquest .players');
            var players = friends.filter(function(friend) { return friend.accepted; }).map(function(friend) { return { name: friend.username, id: friend.friendid }; });
            players.unshift({ name: 'Ich', id: playerid });
            playersdiv.innerHTML = players.map(function(player) {
                return '<label><input type="checkbox" name="players" value="' + player.id + '" /><span>' + player.name + '</span></label>';
            }).join('');
            document.body.setAttribute('class', 'addquest');
        },
        showinvisiblequests: async function(showinvisible) {
            await _listquests(showinvisible);
            var card = document.querySelector('.card.quests');
            if (showinvisible) card.classList.add('showinvisible');
            else card.classList.remove('showinvisible');
        },
        showloggedincard: _showloggedincard,
        showlogincard: _showlogincard,
        showplayerqueststab: _showplayerqueststab,
        showregistercard: function() {
            document.querySelector('.card.register .errormessage').style.display = 'none';
            document.body.setAttribute('class', 'register');
        },
        showqueststab: _showqueststab,
        showfriendstab: _showfriendstab,
    };
})();