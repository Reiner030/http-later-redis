var createStorage = require("http-later-storage"),
    sha1 = require("crypto").createHash.bind(null, "sha1"),
    redis = require("redis");

/**
 * Queue a serialized request and pass the storage key to the callback.
 * @param {object} task
 * @param {function} done
 */
function queue(task, done) {
    var storage = this,
        key = this.keygen(task);

    // store task as JSON serialized string
    task = JSON.stringify(task);

    // first add the key to the queue
    this.client().rpush(this.queueKey(), key, function(err) {
        if (err) done(err);

        // now store task data
        else storage.client().set(key, task, function(err) {
            if (err) done(err);
            else done(null, key);
        });
    });
}

/**
 * Remove a task from the queue and pass it to the callback.
 * @param {function} done
 */
function unqueue(done) {
    var storage = this;

    this.client().lpop(this.queueKey(), function(err, key) {
        if (err) return done(err);

        storage.client().get(key, function(err, task) {
            if (err) return done(err);
            if (!task) return done();

            storage.client().del(key);
            done(null, JSON.parse(task), key);
        });
    });
}

/**
 * Log task result.
 * @param {string} key
 * @param {object} result
 * @param {function} done
 */
function log(key, result, done) {
    var storage = this;
    
    // store result as JSON serialized string
    result = JSON.stringify(result);

    // generate result key from task key
    key = key + "-result";
    
    // first add the key to the log
    this.client().rpush(this.logKey(), key, function(err) {
        if (err) done(err);

        // now store result data
        else storage.client().set(key, result, done);
    });
};

/**
 * LaterStorage Redis implementation.
 * @constructor
 * @augments {LaterStorage}
 * @param {object} [opts]
 * @param {string} [opts.keyspace]
 */
var RedisStorage = createStorage(queue, unqueue, log);

/**
 * Return the underlying redis client object.
 * @returns {object}
 */
RedisStorage.prototype.redis = function() {
    if (!this.redis) this.redis = redis.createClient();
    return this.redis;
};

/**
 * Prefix key with keyspace.
 * @param {string} key
 * @returns {string}
 */
RedisStorage.prototype.addKeyspace = function(key) {
    return String(this.keyspace) + key;
};

/**
 * Return the key of the queue.
 * @returns {string}
 */
RedisStorage.prototype.queueKey = function() {
    return this.addKeyspace("queue");
};

/**
 * Return the key of the log.
 * @returns {string}
 */
RedisStorage.prototype.logKey = function() {
    return this.addKeyspace("log");
};

/**
 * Generate a key for the provided task.
 * @param {object} task
 * @returns {string}
 */
RedisStorage.prototype.keygen = function(task) {
    task = JSON.stringify(task);
    hash = sha1();
    hash.update(task);
    return this.addKeyspace(hash.digest("hex"));
}

/** export RedisStorage class */
module.exports = RedisStorage;
