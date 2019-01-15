/**
 * (Fast) alle Aufrufe sind asynchron.
 * 
 * let ac = new ArrangeClient();
 * let loginResult = await ac.login();
 * let userId = loginResult._id;
 * if (loginResult.error) ... ;
 * let getResult = await ac.get('/api/...');
 */
class ArrangeClient {

    async del(url) {
        return this.request('DELETE', url);
    }

    async get(url) {
        return this.request('GET', url);
    }

    /**
     * username und password sind optional. Wenn nicht angegeben, wird versucht, diese aus dem
     * localStorage auszulesen.
     */
    async login(username, password) {
        if (!username) username = localStorage.getItem('username');
        if (!password) password = localStorage.getItem('password');
        let user = await this.post('/api/arrange/login', { username: username, password: password }, true);
        if (user.error) return user; // Anmeldung fehlgeschlagen. Der Aufrufer muss sich kümmern
        this.user = user;
        localStorage.setItem('username', username);
        localStorage.setItem('password', password);
    }

    logout() {
        delete this.user;
        localStorage.removeItem('username');
        localStorage.removeItem('password');
    }

    async post(url, data, withoutLogin) {
        return this.request('POST', url, data, withoutLogin);
    }

    async register(username, password) {
        let user = await this.post('/api/arrange/register', { username: username, password: password }, true);
        if (user.error) return user; // Registrierung fehlgeschlagen. Der Aufrufer muss sich kümmern
        this.user = user;
        localStorage.setItem('username', username);
        localStorage.setItem('password', password);
    }

    async request(mode, url, data, withoutLogin) {
        let self = this;
        if (!withoutLogin && (!self.user || !self.user.token)) {
            // Anmeldeversuch mit Daten aus localStorage
            let user = await self.login(localStorage.getItem('username'), localStorage.getItem('password'));
            if (user.error) return user; // Automatische Anmeldung hat nicht geklappt. Fehler einfach zurück geben. Muss sich der Aufrufer drum kümmern.
        }
        return new Promise(function(resolve) {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function() {
                if (this.readyState == 4) {
                    try {
                        const result = JSON.parse(this.responseText);
                        resolve(result);
                    } catch(ex) {
                        resolve({ error: ex });
                    }
                }
            };
            xmlhttp.open(mode, url);
            if (!withoutLogin && self.user.token) {
                xmlhttp.setRequestHeader('x-access-token', self.user.token);
            }
            if (mode === 'POST') {
                xmlhttp.setRequestHeader('Content-Type', 'application/json');
                xmlhttp.send(JSON.stringify(data));
            } else {
                xmlhttp.send();
            }
        });
    }

}