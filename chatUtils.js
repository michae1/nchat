var redis = require('redis'),
    cookieParser = require('cookie-parser'),
    socketServer  = require('r2d2/server/vws.socket.js').server,
    Q = require('q'),
    channels = require('./channels'),
    conf = require( './config');

exports = module.exports = {    

    adoptMsg: function(parsed){
        parsed.action.command = 'messages';
        console.log(JSON.stringify(parsed))
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
                var connLeft;
                channels.addClient(channel);
                connLeft = channels.removeClient(this._meta.channel);
                _this._meta.channel = channel;
                if (!connLeft){
                    return Q.ninvoke(this._meta.sub, "unsubscribe", this._meta.channel)
                }
            })
    },

    notifyClients: function(channel, msg){
        console.log('REDIS:* got message from redis ', channel);
        if (channel != this._meta.channel)
            return false;
        var parsedMsg = JSON.parse(msg)
        if (this._meta.server.id != parsedMsg.id){
            this.send( exports.adoptMsg(parsedMsg) );
        }
    },

    startNewClient: function(connection, server, pub, sub){
        console.log('New client connected, starting');
        var _this = this;
        _this._meta = {};
        _this._meta.channel = conf.chatDefaultChannel;
        _this._meta.pub = pub;
        _this._meta.sub = sub;
        channels.addClient(_this._meta.channel);
                
        return Q.ninvoke(_this._meta.sub, "subscribe", _this._meta.channel)
            
            .then(function(){
                _this._meta.connection = connection;
                _this._meta.server = server;   
                console.log('WS: [open]');
                console.log('WS: my id:', _this.id);

                _this._meta.sub.on('message', function(channel, msg){
                    exports.notifyClients.call(_this, channel, msg);
                });
                return true;     
            },function(err){console.log('error',err)})

    },
    processMessage: function(msg){
        var _this = this,
            parsedMsg = JSON.parse(msg.utf8Data),
            messageChannel = exports.getChannelFromMsg(parsedMsg);
        if (parsedMsg.action && parsedMsg.action.command){  
            if (parsedMsg.action.command == 'join'){
                if (messageChannel != this._meta.channel){
                    return exports.changeChannel.call(this, messageChannel)
                        .then(function(){
                            console.log('resubscribed');
                            // TODO: load chat from redis
                        })
                    }
            } else if (parsedMsg.action.command == 'msg') {
                _this._meta.pub.publish(_this._meta.channel, msg.utf8Data);
                // TODO store in redis
            }
        
        }    
        

    },
    closeAllRelated: function(){
        console.log('Client left, closing related connections');
        var connLeft = channels.removeClient(this._meta.channel);
        console.log('left:', connLeft)
        if (!connLeft){
            return Q.ninvoke(this._meta.sub, "unsubscribe", this._meta.channel)
                .then(function(){console.log('No clients left in channel unsubscribe:', this._meta.channel);},
                    function(err){console.log('Err', err);});    
        }
        
    }
}