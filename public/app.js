var App = (function() {

    var USERNAMEKEY = 'username';
    var PASSWORDKEY = 'password';

    // Create arrange instance connected to the local server
    // To connect to a different server, use const arr = Arrange('https://mydomain.com')
    var arr = Arrange();

    async function _listmodels() {
        var result = await arr.list('models', { result: [ '_id' ]});
        _log(result);
    }

    async function _listusers() {
        var result = await arr.listusers();
        _log(result);
    }

    var _log = console.log;

    async function _login() {
        event.preventDefault();
        var errormessagediv = document.querySelector('.card.login .errormessage');
        errormessagediv.style.display = 'none';
        var username = event.target.username.value;
        var password = event.target.password.value;
        var result = await arr.login(username, password);
        if (result._id) {
            // Login succeeded
            _storeusercredentials(username, password);
            _showloggedincard();
        }
        else if (result.error) {
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
        var result = await arr.register(username, password1);
        if (result._id) {
            // Registration and login succeeded
            _storeusercredentials(username, password1);
            _showloggedincard();
        } else {
            // Registrierung fehlgeschlagen
            errormessagediv.style.display = 'block';
        }
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
        var result = await arr.setpassword(password);
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
        var result = await arr.login(username, password);
        if (result.error) {
            // Clear stored credentials on failure
            _storeusercredentials();
            _showlogincard();
        }
        _showloggedincard();
    }

    window.addEventListener('load', function() {
        _tryautologin();
    });

    return {
        // Schwellen-EPs werden direkt auf dem Client gespeichert. Einmal laden und fertig.
        epthresholds: epthresholds = [0,100,210,331,464,610,771,948,1142,1356,1591,1850,2135,2448,2793,3172,3589,4048,4553,5108,5719,6391,7131,7945,8840,9824,10907,12098,13408,14850,16436,18180,20099,22210,24532,27086,29896,32987,36387,40127,44241,48766,53744,59220,65244,71870,79159,87176,95995,105696,116367,128106,141018,155222,170846,188033,206938,227734,250610,275773,303453,333901,367393,404235,444761,489340,538377,592317,651651,716919,788714,867688,954560,1050119,1155234,1270860,1398049,1537957,1691856,1861145,2047363,2252203,2477527,2725383,2998025,3297931,3627827,3990713,4389888,4828980,5311982,5843284,6427716,7070591,7777754,8555633,9411300,10352534,11387891,12526784,13779566,],
        listmodels: _listmodels,
        listusers: _listusers,
        log: _log,
        login: _login,
        logout: _logout,
        register: _register,
        setpassword: _setpassword,
        showloggedincard: _showloggedincard,
        showlogincard: _showlogincard,
        showregistercard: function() {
            document.querySelector('.card.register .errormessage').style.display = 'none';
            document.body.setAttribute('class', 'register');
        },
    };
})();