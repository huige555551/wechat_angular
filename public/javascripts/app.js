'use strict';
var app = angular.module("chatRoom", []);
app.factory('socket', function ($rootScope) {
    var socket = io(); //默认连接部署网站的服务器
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {   //手动执行脏检查
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        }
    }
});
app.factory('userService', function($rootScope){
    return{
        get: function (users,nickname) {
            for (var i = 0; i < users.length; i++)
                if (users[i].nickname == nickname) {

                    return users[i];
                }
                return null;
        }
    }
})
app.controller("chatCtrl", ['$scope', 'socket', 'userService','$timeout',function ($scope, socket, userService, $timeout) {
    $scope.hasLogined = false;
    var messageWrapper= $('.message-wrapper');
    $scope.error = false;
    $scope.publicMessages = [];
    $scope.privateMessages = {};
    $scope.messages = $scope.publicMessages;
    $scope.scrollToBottom=function(){
        messageWrapper.scrollTop(messageWrapper[0].scrollHeight);
    }
    $scope.setReceiver = function (user) {
        $scope.receiver = user.nickname;
        //点击私信
        if (user.nickname) {
            if (!$scope.privateMessages[$scope.receiver])
                $scope.privateMessages[$scope.receiver] = []
            $scope.messages = $scope.privateMessages[$scope.receiver];
            var user = userService.get($scope.users, user.nickname);
            user.hasNewMessage=false;

        }
        //点击群发
        else {
            $scope.messages = $scope.publicMessages;
            var user = userService.get($scope.users, '');
            user.hasNewMessage=false;
        }

    };
    $scope.sendMessage = function () {
        var msg = {
            type: 'normal',
            content: $scope.content,
            from: $scope.nickname,
            to: $scope.receiver,
            time: new Date()
        };
        if ($scope.receiver) {
            if (!$scope.privateMessages[$scope.receiver])
                $scope.privateMessages[$scope.receiver] = []
            $scope.privateMessages[$scope.receiver].push(msg);
        }
        else
            $scope.publicMessages.push(msg);
        $scope.content = '';
        if ($scope.receiver != $scope.nickname)
            socket.emit("addMessage", msg);

    };
    $scope.login = function () { //登录
        socket.emit("addUser", {nickname: $scope.nickname});
    };
    //收到登录结果
    socket.on('userAddingResult', function (data) {
        console.log(data.result);
        if (data.result) {
            $scope.hasLogined = true;
        } else { //昵称被占用
            $scope.hasLogined = false;
            $scope.error = true;
        }
    });
    //收到所有user
    socket.on('allUser', function (data) {
        console.log('allUser', data);
        $scope.users = data;
    });
    //收到新加入的用户
    socket.on('userAdded', function (data) {
        console.log('userAdded', data);
        $scope.users.push(data);
        $scope.publicMessages.push({type: 'welcome', content: data.nickname});

    });
    //收到用户退出
    socket.on('userRemoved', function (data) {
        console.log('userRemoved', data);
        for (var i = 0; i < $scope.users.length; i++) {
            if ($scope.users[i].nickname == data.nickname) {
                $scope.users.splice(i, 1);
                $scope.publicMessages.push({type: 'bye', content: data.nickname})
            }
        }
    });
    //用户收到消息
    socket.on('messageAdded', function (data) {
        console.log('messageAdded', data);
        //私信
        if (data.to) {
            var user = userService.get($scope.users, data.from);
            user.hasNewMessage=true;
            if (!$scope.privateMessages[data.from])
                $scope.privateMessages[data.from] = [];
            $scope.privateMessages[data.from].push({
                type: 'normal',
                content: data.content,
                from: data.from,
                to: data.to,
                time: new Date()
            });
        }
        //群发
        else {
            var user = userService.get($scope.users, '');
            user.hasNewMessage=true;
            $scope.publicMessages.push({
                type: 'normal',
                content: data.content,
                from: data.from,
                to: data.to,
                time: new Date()
            });
        }

    });
}]);
app.directive('message', ['$timeout', function ($timeout) {
    return {
        restrict: 'E',
        templateUrl: '/temp/message',
        replace:true,
        link:function(scope, elem, attrs){
            $timeout(scope.scrollToBottom);
        }
    };
}])
    .directive('user', ['$timeout', function ($timeout) {
        return {
            restrict: 'E',
            templateUrl: '/temp/directive',
            scope:{
                info:"="
            },
            replace:true
        };
    }]);
