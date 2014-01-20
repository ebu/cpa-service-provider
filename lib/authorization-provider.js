"use strict";

var request = require('request');

function AuthorizationProvider(args) {
  this.authorizationUri = args.authorizationUri;
  this.logger           = args.logger;
}

AuthorizationProvider.prototype.isAuthorized = function(accessToken, callback) {
  var self = this;

  var requestOptions = {
    uri:  this.authorizationUri,
    form: { token: accessToken }
  };

  request.post(requestOptions, function(error, response, body) {
    if (error) {
      self.logger.error(error);
      callback(error);
      return;
    }

    if (response.statusCode >= 200 && response.statusCode <= 299) {
      callback(null, true);
    }
    else if (response.statusCode === 401) {
      callback(null, false);
    }
    else {
      error = new Error("Error from authorization provider");
      error.statusCode = response.statusCode;

      self.logger.error(error);
      callback(error);
    }
  });
};

module.exports = AuthorizationProvider;
