var mysql = require('mysql');

/**
 * Create database:
 * create database liaga default character set utf8 default collate utf8_bin;
 * GRANT ALL PRIVILEGES ON liaga.* to liaga@'localhost' IDENTIFIED BY 'liaga';
 */
var db = {};

/**
 * Environment variables: DBHOST, DB, DBUSER, DBPASSWORD
 */
db.connect = async function() {
    db.connection = mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASSWORD,
        database: process.env.DB,
        multipleStatements: true
    });
    return new Promise(function(resolve, reject) {
        db.connection.connect(function (err) {
            if (err) return reject(err);
            resolve();
        });
    });
}

/**
 * Promisified query function.
 */
db.query = async function(query, params) {
    return new Promise(function(resolve, reject) {
        db.connection.query(query, params, function(err, result) {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

/**
 * Schema der Datenbank aktualisieren.
 * [
 *  {
 *   tablename: "aaa",
 *   columns: [
 *    { name: "id", type: "TEXT(255)" },
 *   ]
 *  },
 * ]
 */
db.init = async function(schema) {
    console.log('DB: Updating schema');
    var tablesresult = await db.query('show tables;');
    var tablenames = tablesresult.map(function(d) { return d[Object.keys(d)[0]]; });
    var queries = [];
    for (var i = 0; i < schema.length; i++) {
        var tabledef = schema[i];
        var tablename = tabledef.tablename;
        var columns = tabledef.columns;
        var columnnames = [];
        if (tablenames.indexOf(tablename) < 0) {
            queries.push('create table ' + tablename + '(id int not null auto_increment, primary key (id));');
        } else {
            var columnsresult = await db.query('show columns from ' + tablename + ';');
            columnnames = columnsresult.map(function(d) { return d.Field; });
        }
        for (var j = 0; j < columns.length; j++) {
            var columndef = columns[j];
            var columnname = columndef.name;
            if (columnnames.indexOf(columnname) < 0) {
                queries.push('alter table ' + tablename + ' add column ' + columndef.name + ' ' + columndef.type + ';');
            }
        }
    }
    if (queries.length > 0) {
        var joinedqueries = queries.join(' ');
        await db.query(joinedqueries);
        console.log(queries.join('\n'));
    }
}

module.exports = db;
