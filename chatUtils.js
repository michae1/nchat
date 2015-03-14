'use strict';

var redis = require('redis'),
    cookieParser = require('cookie-parser'),
    socketServer  = require('r2d2/server/vws.socket.js').server,
    Q = require('q'),
    channels = require('./channels'),
    conf = require( './config');

exports = module.exports = {    
    storeMessage: function(msg, channel){
        return Q.ninvoke(this._meta.rclient, "zadd", this._meta.channel, +(new Date()), msg).
            then(
                function(rez){console.log('rez',rez)},
                function(rez){console.log('err',rez)}
                )
    },
    getMessages: function(channel){
        // Get messages history for channel
        var currentTimeStamp = +(new Date())
        return Q.ninvoke(this._meta.rclient, "zrangebyscore", this._meta.channel, (currentTimeStamp-conf.chatMessagesTTL), "+inf").
            then(
                function(rez){
                    console.log('rez', rez)
                    return JSON.stringify({
                        'id': 'server',
                        'action': {
                            'command': 'messages',
                            'data': rez.map(JSON.parse)
                        }
                    });
                },
                function(rez){console.log('err',rez)}
                )
    },
    adoptMsg: function(parsed){
        if (parsed.action.command == 'msg')
            parsed.action.command = 'messages';
        return JSON.stringify(parsed.action);        
    },
    getChannelFromMsg: function(parsed){
        if (parsed.action && parsed.action.data && parsed.action.data.length > 0);
        return parsed.action.data[0].channel;
    },

    changeChannel: function (channel) {
        var _this = this;
        return Q.ninvoke(_this._meta.sub, "subscribe", channel)
            .then(function(){
                var connLeft,
                    oldChannel = _this._meta.channel;
                channels.addClient(channel);
                connLeft = channels.removeClient(_this._meta.channel);
                _this._meta.channel = channel;
                if (!connLeft){
                    console.log('no clients left in channel, unsubscribe from ', oldChannel)
                    return Q.ninvoke(_this._meta.sub, "unsubscribe", oldChannel)
                } 
            })
    },

    notifyClient: function(channel, msg){
        if (channel != this._meta.channel){
            return false;
        }
        var parsedMsg = JSON.parse(msg)
        // if (this._meta.server.id != parsedMsg.id){
        var adoptedMessage = exports.adoptMsg(parsedMsg);
        this.send( adoptedMessage );
        return true;
        // }
    },

    startNewClient: function(connection, server, pub, sub, rclient){
        console.log('New client connected, starting');
        var _this = this;
        this._meta = {};
        // this._meta.channel = conf.chatDefaultChannel;
        this._meta.pub = pub;
        this._meta.sub = sub;
        this._meta.rclient = rclient;
        channels.addClient(_this._meta.channel);
                
        return Q.ninvoke(_this._meta.sub, "subscribe", _this._meta.channel)
            
            .then(function(){   
                _this._meta.connection = connection;
                _this._meta.server = server;   
                console.log('WS: [open]');
                console.log('WS: my id:', _this.id);
                exports.joinClientToChannel.call(_this, conf.chatDefaultChannel);
                
                _this._meta.sub.on('message', function(channel, msg){
                    exports.notifyClient.call(_this, channel, msg);
                });
                return true;     
            },function(err){console.log('error',err)})

    },
    joinClientToChannel: function(messageChannel){
        var _this = this;
        if (messageChannel != this._meta.channel){
            return exports.changeChannel.call(_this, messageChannel)
                .then(function(){
                    return exports.getMessages.call(_this, messageChannel)
                        .then(function(msgs){
                            return exports.notifyClient.call(_this, messageChannel, msgs)
                                .then(function(succ){return succ}, function(err){console.log('err',err)})
                        })
                    // TODO: load chat from redis
                }, function(err){console.log('err',err)})
            }
    },
    processMessage: function(msg){
        var _this = this,
            parsedMsg = JSON.parse(msg.utf8Data),
            messageChannel = exports.getChannelFromMsg(parsedMsg);

        if (parsedMsg.action && parsedMsg.action.command){  
            if (parsedMsg.action.command == 'join'){
                exports.joinClientToChannel.call(_this, messageChannel);
            } else if (parsedMsg.action.command == 'msg') {
                console.log('we have message, lets save it and publish')
                _this._meta.pub.publish(_this._meta.channel, msg.utf8Data);
                return exports.storeMessage.call(this, JSON.stringify(parsedMsg.action.data[0]), messageChannel)
                // TODO store in redis
            }
        
        }    
        

    },
    closeAllRelated: function(){
        console.log('Client left, closing related connections');
        var connLeft = channels.removeClient(this._meta.channel),
        _this = this;
        console.log('left:', connLeft)
        if (!connLeft){
            return Q.ninvoke(_this._meta.sub, "unsubscribe", _this._meta.channel)
                .then(function(){console.log('No clients left in channel unsubscribe:', _this._meta.channel);},
                    function(err){console.log('Err', err);});    
        }
        
    }
}