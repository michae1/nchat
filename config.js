var config = {}

config.redisHost = 'localhost';
config.redisPort = 6379;
config.webPort = 3090;
config.chatDefaultChannel = 'defaultChannel';
config.chatMessagesTTL =  86400*1000; // in milliseconds 86400000 for 24 hour

module.exports = config;