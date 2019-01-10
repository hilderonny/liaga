/**
 * Simplified access to database.
 * Usage: var collection = require('./db')(collectionName);
 */
const monk = require('monk');

const dburl = process.env.DBURL || '127.0.0.1:27017/liaga';

module.exports = function(collectionName) {
    return monk(dburl).get(collectionName);
}
