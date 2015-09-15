HTTP Later Redis Driver
=======================
Redis driver for `http-later`.

Usage
-----
```js
var later = require("http-later"),
    RedisStorage = require("http-later-redis"),
    redis = new RedisStorage({keyspace: "prefix:"}),
    server = later.createServer({storage: redis});

server.listen(2112);
```
