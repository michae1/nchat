'use strict';

var app = require('express')(),
    conf = require( './config'),
    http = require('http').Server(app),
    redis = require('redis'),
    cookieParser = require('cookie-parser'),
    socketServer  = require('r2d2/server/vws.socket.js').server,
    Q = require('q'),
    WebSocketConnection = require('websocket').connection;



var pub = redis.createClient();


console.log("Connected to redis");

function adoptMsg(parsed){
    parsed.action.command = 'messages';
    console.log(JSON.stringify(parsed))
    return JSON.stringify(parsed.action);        
}
function getChannelFromMsg(parsed){
    if (parsed.action && parsed.action.data && parsed.action.data.length > 0);
    return parsed.action.data[0].channel;
}

WebSocketConnection.prototype.changeChannel = function (channel) {
    // TODO this will be in server variable
    // TODO add promises
    var _this = this;
    console.log('resubscribe to ',channel)
    return Q.ninvoke(_this._meta.sub, "unsubscribe")
        .then(function(){
            _this._meta.channel = channel;
            return Q.ninvoke(_this._meta.sub, "subscribe", _this._meta.channel)
        })
}

WebSocketConnection.prototype.notifyClients = function(channel, msg){
    console.log('REDIS:* got message from redis ', channel);
    console.log(arguments)
    var parsedMsg = JSON.parse(msg)
    if (this._meta.server.id != parsedMsg.id){
        this.send( adoptMsg(parsedMsg) );
    }
}
WebSocketConnection.prototype.startNewClient = function(connection, server){
    console.log('New client connected, starting');
    var _this = this;
    this._meta.channel = 'all'
    _this._meta.sub = redis.createClient();
            
    return Q.ninvoke(_this._meta.sub, "subscribe", _this._meta.channel)
        
        .then(function(){
            console.log('last then')
            _this._meta.connection = connection;
            _this._meta.server = server;   

            console.log('WS: [open]');
            console.log('WS: my id:', _this.id);

            // Here we should init sub client
            
            console.log('lets init sub')
            _this._meta.sub.on('message', function(channel, msg){
                _this.notifyClients(channel, msg);
            });
            return true;     
        },function(err){console.log('error',err)})

}
WebSocketConnection.prototype.processMessage = function(msg){
    console.log('process message')
    var _this = this,
        parsedMsg = JSON.parse(msg.utf8Data),
        messageChannel = getChannelFromMsg(parsedMsg);
        console.log(messageChannel);
        console.log(this._meta.channel);

    if (messageChannel != this._meta.channel){
        return _this.changeChannel(messageChannel)
            .then(function(){
                console.log('resubscribed');
                // sub.on('message', _this.notifyClients.apply(this))
                pub.publish(_this._meta.channel, msg.utf8Data);
            })
    } else {
        pub.publish(_this._meta.channel, msg.utf8Data);
    }

    // if (this.id == parsedMsg.id)
        
}
WebSocketConnection.prototype._meta = {};

socketServer( 'nchat', function ( connection, server ) {
    connection.on('open', function ( id ) {
        this.startNewClient(connection, server);
    });

    connection.on('message', function ( msg ) {
        this.processMessage(msg);
    });

    connection.on('error', function ( err ) {
        console.log('WS: ',err);
    });

    connection.on('close', function(){
        return Q.ninvoke(_this._meta.sub, "unsubscribe")
            .then(function(){console.log('WS: [close], unsubscribed');});
        
    });

    

}).config( {
  port: conf.webPort
} );  

