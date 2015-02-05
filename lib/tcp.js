'use strict';

var { Class } = require('sdk/core/heritage');
var { Cc, Ci, Cu, Cm } = require('chrome');
var xpcom = require('sdk/platform/xpcom');
var categoryManager = Cc["@mozilla.org/categorymanager;1"]
                      .getService(Ci.nsICategoryManager);

var contractId = '@mozilla.org/tcp-server;1';

var TcpSocket = Class({
  extends: xpcom.Unknown,
  interfaces: [ Ci.nsIDOMGlobalPropertyInitializer ],
  get wrappedJSObject() this,

  init: function(win) {
    var eventHandler = new EventHandler();
  	var tcpSocket = Cc["@mozilla.org/tcp-socket;1"].createInstance(Ci.nsIDOMTCPSocket);
    var self = this;

    var tcpServerSocket;
    var connectedSocket;

    return {
      listen: function(port) {
        tcpServerSocket = tcpSocket.listen(port);
        console.log("Listening on port: " + port);

        tcpServerSocket.onconnect = function(socket) {
          connectedSocket = socket;

          connectedSocket.ondata = function(e) {
            eventHandler.fireEvent('ondata', e.data);
          };

          connectedSocket.onerror = function(e) {
            eventHandler.fireEvent('onerror', e.data);
          };

          connectedSocket.onclose = function(e) {
            eventHandler.fireEvent('onclose', e.data);
          };

          eventHandler.fireEvent('onconnect');
        };
      },

      send: function(data) {
        console.log("send data");
        if (!connectedSocket) {
          console.log("error: no connected socket!");
          return;
        }

        connectedSocket.send(data);
      },

      registerListener: function(topic, listener) {
        console.log("registerListener " + topic);
        eventHandler.addEventListener(topic, listener);
      },

      removeListener: function(topic, listener) {
        eventHandler.removeEventListener(topic, listener);
      },

      __exposedProps__: {
        listen: 'r',
        send: 'r',
        registerListener: 'r',
        removeListener: 'r'
      }
    };
  }
});

// Create and register the factory
var factory = xpcom.Factory({
  contract: contractId,
  Component: TcpSocket,
  unregister: false
});

var EventHandler = function() {
  var self = this,
  eventList = {};

  this.addEventListener = function(eventName, callback) {
    if(!eventList[eventName]) {
      eventList[eventName] = [];
    }
    eventList[eventName].push(callback);
  };

  this.removeEventListener = function(eventName, callback) {
    var idx = -1;
    if (eventList[eventName]) {
      idx = eventList[eventName].indexOf(callback);
      if(idx != -1) {
        eventList[eventName].splice(idx, 1);
      }
    }
  };

  this.fireEvent = function(eventName, eventObject) {
    if (eventList[eventName]) {
      for (var i = 0; i < eventList[eventName].length; i++) {
        eventList[eventName][i](eventObject);
      }
    }
  };
};

categoryManager.deleteCategoryEntry("JavaScript-navigator-property", contractId, false);
categoryManager.addCategoryEntry("JavaScript-navigator-property", "tcpserver", contractId, false, true);