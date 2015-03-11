'use strict';

var app = require('express')(),
    conf = require( './config'),
    http = require('http').Server(app),
    redis = require('redis'),
    cookieParser = require('cookie-parser'),
    socketServer  = require('r2d2/server/vws.socket.js').server;
    // session = require('express-session'),
    // RedisStore = require('connect-redis')(session),
    // rClient = redis.createClient(),
    // sessionStore = new RedisStore({client:rClient});

var sub = redis.createClient();
var pub = redis.createClient();
sub.subscribe('chat');

console.log("Connected to redis");

var cookieParser = cookieParser('My secret will be here but later');




socketServer( 'example', function ( connection, server ) {

  connection.on('open', function ( id ) {
    console.log('[open]');
  });

  connection.on('message', function ( msg ) {
    console.log('[message]');
    console.log(msg);
    connection.send( msg.utf8Data );
    var msg = JSON.parse(data);
    var reply = JSON.stringify({action:'message', user:session.user, msg:msg.msg });
    pub.publish('chat', reply);
  });

  connection.on('error', function ( err ) {
    console.log(err);
  });

  connection.on('close', function(){
    // console.log('[close]');
  });

  sub.on('message', function (channel, message) {
        connection.send( channel, msg.utf8Data );
    });


}).config( {port    : 3020} );  

