'use strict';

var singleton,
    obj;

 // Singleton object to store/manage count of channel users for this node
 // Dict used to find when we need unsubscribe empty channel to save resources   

function Channels( args ) {
    this.channels = {};
}
Channels.prototype = {
    addClient: function(channel){
        if (this.channels[channel])
            this.channels[channel] +=1;
        else 
            this.channels[channel] = 1;
        
    },
    removeClient: function(channel){
        // returns number of clients left
        var left = 0;
        if (this.channels[channel])
            this.channels[channel] -=1;
        left = parseInt(this.channels[channel])
        if (this.channels[channel] == "0")
            delete this.channels[channel]
        return left
    }
}
if (!singleton)
    singleton = new Channels();

exports.addClient = function(channel){
    return singleton.addClient(channel)
}

exports.removeClient = function(channel){
    return singleton.removeClient(channel)
}