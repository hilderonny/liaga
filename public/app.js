var App = (function() {

    var outputDiv = document.getElementById('output');
    var USERNAMEKEY = 'username';
    var PASSWORDKEY = 'password';

    // Create arrange instance connected to the local server
    // To connect to a different server, use const arr = Arrange('https://mydomain.com')
    var arr = Arrange();
    // Login to arrange
    //await arr.login('myusername', 'password');
    // Fetch a list of all entities of the "models" table
    //var modellist = await arr.list('models');

    async function _listmodels() {
        var result = await arr.list('models', { result: [ '_id' ]});
        _log(result);
    }

    async function _listusers() {
        var result = await arr.listusers();
        _log(result);
    }

    function _log() {
        // TODO: Argumente iterieren, stringifizieren und ausgeben
        for (var i = 0; i < arguments.length; i++) {
            outputDiv.innerHTML += "<pre>" + JSON.stringify(arguments[i], undefined, 4) + "</pre>";
        }
        outputDiv.scrollTop = outputDiv.scrollHeight;
    }

    async function _login() {
        event.preventDefault();
        var username = event.target.username.value;
        var password = event.target.password.value;
        var result = await arr.login(username, password);
        if (result._id) {
            // Login succeeded
            _storeusercredentials(username, password);
        }
        else if (result.error) {
            // Clear stored credentials on failure
            _storeusercredentials();
        }
        _log(result);
    }

    async function _logout() {
        // Simply clear the local storage of user credentials
        _storeusercredentials();
    }

    async function _register() {
        event.preventDefault();
        var username = event.target.username.value;
        var password1 = event.target.password1.value;
        var password2 = event.target.password2.value;
        if (password1 !== password2) {
            _log("Password mismatch");
            return;
        }
        var result = await arr.register(username, password1);
        if (result._id) {
            // Registration and login succeeded
            _storeusercredentials(username, password1);
        }
        _log(result);
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
            return false;
        }
        var result = await arr.login(username, password);
        if (result.error) {
            // Clear stored credentials on failure
            _storeusercredentials();
        }
        _log(result);
        return result;
    }

    return {
        listmodels: _listmodels,
        listusers: _listusers,
        login: _login,
        logout: _logout,
        register: _register,
        setpassword: _setpassword,
        tryautologin: _tryautologin,
    };
})();