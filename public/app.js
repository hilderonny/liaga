var App = (function() {

    var USERNAMEKEY = 'username';
    var PASSWORDKEY = 'password';

    var token;

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

    async function _listquests() {
        var quests = await _post('/api/quest/list');
        var questlist = document.querySelector('.card.loggedin .tab.quests .list');
        questlist.innerHTML = "";
        console.log(quests);
        quests.sort(function(a, b) { // Erst Aufwand absteigend, dann Titel alphabetisch
            return b.effort - a.effort || a.title.localeCompare(b.title);
        });
        quests.forEach(function(quest) {
            var node = document.createElement('div');
            node.classList.add('effort' + quest.effort);
            node.addEventListener('click', function() {
                _showeditquestcard(quest.id);
            });
            node.innerHTML = quest.title;
            questlist.appendChild(node);
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
            token = result.token;
            _storeusercredentials(username, password);
            _showloggedincard();
            _listquests();
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
            token = result.token;
            _storeusercredentials(username, password1);
            _showloggedincard();
            _listquests();
        } else {
            // Registrierung fehlgeschlagen
            errormessagediv.style.display = 'block';
        }
    }

    async function _showeditquestcard(id) {
        var quest = await _post('/api/quest/get', { id: id });
        var form = document.querySelector('.card.editquest form');
        form.onsubmit = async function() {
            event.preventDefault();
            await _post('/api/quest/save', {
                id: id,
                title: event.target.title.value,
                description: event.target.description.value,
                effort: event.target.effort.value,
                minlevel: event.target.minlevel.value,
                type: event.target.type.value,
            });
            _showloggedincard();
            _listquests();
            return false;
        };
        document.querySelector('.card.editquest .deletequest').onclick = async function() {
            event.preventDefault();
            if (!confirm('Quest wirklich löschen?')) return false;
            await _post('/api/quest/delete', { id: id });
            _showloggedincard();
            _listquests();
            return false;
        };
        form.title.value = quest.title;
        form.description.value = quest.description;
        form.effort.value = quest.effort;
        form.minlevel.value = quest.minlevel;
        form.type.value = quest.type;
        document.body.setAttribute('class', 'editquest');
    }

    function _showloggedincard() {
        document.body.setAttribute('class', 'loggedin');
    }

    function _showlogincard() {
        document.querySelector('.card.login .errormessage').style.display = 'none';
        document.body.setAttribute('class', 'login');
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
        token = result.token;
        _showloggedincard();
        _listquests();
    }

    window.addEventListener('load', function() {
        _tryautologin();
    });

    return {
        addquest: async function() {
            event.preventDefault();
            await _post('/api/quest/add', {
                title: event.target.title.value,
                description: event.target.description.value,
                effort: event.target.effort.value,
                minlevel: event.target.minlevel.value,
                type: event.target.type.value,
            });
            _listquests();
            _showloggedincard();
        },
        // Schwellen-EPs werden direkt auf dem Client gespeichert. Einmal laden und fertig.
        epthresholds: epthresholds = [0,100,210,331,464,610,771,948,1142,1356,1591,1850,2135,2448,2793,3172,3589,4048,4553,5108,5719,6391,7131,7945,8840,9824,10907,12098,13408,14850,16436,18180,20099,22210,24532,27086,29896,32987,36387,40127,44241,48766,53744,59220,65244,71870,79159,87176,95995,105696,116367,128106,141018,155222,170846,188033,206938,227734,250610,275773,303453,333901,367393,404235,444761,489340,538377,592317,651651,716919,788714,867688,954560,1050119,1155234,1270860,1398049,1537957,1691856,1861145,2047363,2252203,2477527,2725383,2998025,3297931,3627827,3990713,4389888,4828980,5311982,5843284,6427716,7070591,7777754,8555633,9411300,10352534,11387891,12526784,13779566,],
        listquests: _listquests,
        log: _log,
        login: _login,
        logout: _logout,
        register: _register,
        setpassword: _setpassword,
        showaddquestcard: function() {
            var form = document.querySelector('.card.addquest form');
            form.title.value = "";
            form.description.value = "";
            form.effort.value = 5;
            form.minlevel.value = 0;
            form.type.value = 0;
            document.body.setAttribute('class', 'addquest');
        },
        showloggedincard: _showloggedincard,
        showlogincard: _showlogincard,
        showregistercard: function() {
            document.querySelector('.card.register .errormessage').style.display = 'none';
            document.body.setAttribute('class', 'register');
        },
        showqueststab: function() {
            _listquests();
            document.querySelector('.card.loggedin').setAttribute('class', 'card loggedin quests');
        },
        showfriendstab: function() {
            document.querySelector('.card.loggedin').setAttribute('class', 'card loggedin friends');
        },
    };
})();