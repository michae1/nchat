'use strict';

var app = require('express')(),
    conf = require( './config'),
    http = require('http').Server(app),
    redis = require('redis'),
    cookieParser = require('cookie-parser'),
    socketServer  = require('r2d2/server/vws.socket.js').server,
    Q = require('q'),
    argv = require('optimist').argv,
    u = require('./chatUtils');

var pub = redis.createClient(),
    sub = redis.createClient(),
    rclient = redis.createClient();


console.log("Connected to redis");

socketServer( 'nchat', function ( connection, server ) {
    connection.on('open', function ( id ) {
        u.startNewClient.call(this, connection, server, pub, sub, rclient);
    });

    connection.on('message', function ( msg ) {
        u.processMessage.call(this, msg);
    });

    connection.on('error', function ( err ) {
        console.log('WS: ',err);
    });

    connection.on('close', function(){
        u.closeAllRelated.call(this);
        
    });

}).config( {
  port: argv.port || conf.webPort
} );  

