var express = require('express');
var http = require('http');

var static_port = 8066;
var static_location = "static";
var static_app = express();
static_app.use(require('connect-livereload')());
static_app.use(express.static(static_location));
static_server = http.createServer(static_app).listen(static_port)
    .on('listening', function()
    {
        console.log('Started static content server on http://localhost:' + static_port + '.');
    });