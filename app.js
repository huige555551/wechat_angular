var bodyParser = require('body-parser');
var express = require('express');
var app = require('express')();
var path = require('path');
var logger = require('morgan');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
// // view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(__dirname + '/public'));
var connectedSockets = {};
var allUsers = [{nickname: "", color: "#000"}];

io.on('connection', function (socket) {
    socket.on('addUser', function (data) { //有新用户进入聊天室
        if (connectedSockets[data.nickname]) {//昵称不合法（重复）
            socket.emit('userAddingResult', {result: false});
        }
        else {//昵称合法
            allUsers.push(data);
            socket.nickname = data.nickname
            connectedSockets[data.nickname] = socket;
            socket.emit('userAddingResult', {result: true});
            socket.broadcast.emit('userAdded',  data);
            socket.emit('allUser', allUsers);
        }
    });

    socket.on('addMessage', function (data) { //有用户发送新消息
        if (data.to) {
            //单发
            console.log('单发');
            connectedSockets[data.to].emit('messageAdded', data);
        }
        else {
            //群发
            console.log('群发');
            socket.broadcast.emit('messageAdded', data);
        }

    });
    socket.on('disconnect', function () {  //有用户退出聊天室
            socket.broadcast.emit('userRemoved', {  //广播有用户退出
                nickname: socket.nickname
            });
            for (var i = 0; i < allUsers.length; i++) {
                if (allUsers[i].nickname == socket.nickname) {
                    allUsers.splice(i, 1);
                }
            }
            delete connectedSockets[socket.nickname]; //删除对应的socket实例
        }
    );

});

app.get('/', function (req, res) {
    res.render('index');
});
app.get('/temp/directive',function (req,res) {
    res.render('user');
});
app.get('/temp/message',function (req,res) {
    res.render('message');
});
http.listen(3000, function () {
    console.log('listening on *:3000');
});