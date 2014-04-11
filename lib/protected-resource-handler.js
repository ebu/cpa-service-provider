"use strict";

var async   = require('async');
var request = require('request');

module.exports = function(config, db, logger) {

  /**
   * Returns the access token in the HTTP request, or null if no access token
   * is present.
   */

  var getAccessToken = function(req) {
    var accessToken = null;

    var auth = req.headers.authorization;

    if (auth) {
      var match = auth.match(/^Bearer (\S+)$/);

      if (match) {
        accessToken = match[1];
      }
    }

    return accessToken;
  };

  /**
   * Parses an object from a JSON string. Returns the object, or null
   * if the string is not valid JSON.
   */

  var parseJson = function(json) {
    var data = null;

    try {
      data = JSON.parse(json);
    }
    catch (exception) {
      // Ignore
    }

    return data;
  };

  /**
   * Verifies the given access token with the authorization provider.
   */

  var checkIsAuthorized = function(accessToken, callback) {
    var requestBody = {
      token: accessToken,
      scope: config.service_provider.scope
    };

    var requestOptions = {
      uri:  config.authorization_provider.authorization_uri,
      headers: {
        "Content-type": "application/json"
      },
      body: JSON.stringify(requestBody)
    };

    request.post(requestOptions, function(error, response, body) {
      if (error) {
        callback(error);
        return;
      }

      if (response.statusCode >= 200 && response.statusCode <= 299) {
        var data = parseJson(body);

        if (!data) {
          callback(new Error("Invalid JSON response"));
          return;
        }

        var clientInfo = {
          clientId:        data.client_id,
          userId:          data.user_id,
          userDisplayName: data.display_name
        };

        callback(null, clientInfo);
      }
      else if (response.statusCode === 401) {
        callback(null, null);
      }
      else {
        error = new Error("Error from authorization provider");
        error.statusCode = response.statusCode;

        callback(error);
      }
    });
  };

  var quote = function(string) {
    return '"' + string + '"';
  };

  var sendUnauthorizedResponse = function(res) {
    var headerValue = "CPA " + [
      "name="  + quote(config.authorization_provider.name),
      "uri="   + quote(config.authorization_provider.base_uri),
      "modes=" + quote(config.authorization_provider.modes.join(","))
    ].join(" ");

    res.set('WWW-Authenticate', headerValue);
    res.send(401, "");
  };

  var createUser = function(state, callback) {
    var userId = state.clientInfo.userId;

    if (!userId) {
      callback(null, state);
      return;
    }

    db.User
      .findOrCreate({ id: userId })
      .complete(function(err, user) {
        if (err) {
          callback(err);
          return;
        }

        if (user.display_name !== state.clientInfo.userDisplayName) {
          user.display_name = state.clientInfo.userDisplayName;

          user.save().complete(function(err) {
            if (err) {
              callback(err);
              return;
            }

            state.user = user;
            callback(null, state);
          });
        }
        else {
          state.user = user;
          callback(null, state);
        }
      });
  };

  var createClient = function(state, callback) {
    var clientId = state.clientInfo.clientId;

    if (!clientId) {
      callback(new Error("Invalid client_id"));
      return;
    }

    db.Client
      .findOrCreate({ id: clientId })
      .complete(function(err, client) {
        if (err) {
          callback(err);
          return;
        }

        if (state.user && client.user_id !== state.user.id) {
          client.user_id = state.user.id;

          client.save().complete(function(err) {
            if (err) {
              callback(err);
              return;
            }

            state.client = client;
            callback(null, state);
          });
        }
        else {
          state.client = client;
          callback(null, state);
        }
      });
  };

  /**
   * Express middleware function that verifies an access token with the
   * authorization provider. If the token is not valid, an error response is
   * returned. If the token is valid, this function adds client (device) and
   * user information to the request, for use in subsequent request handler
   * functions.
   */

  var protectedResourceHandler = function(req, res, next) {
    var accessToken = null;

    if (req.headers.authorization) {
      accessToken = getAccessToken(req);

      if (!accessToken) {
        res.json(400, {
          error: 'invalid_request',
          error_description: "Missing access token"
        });

        return;
      }
    }
    else {
      sendUnauthorizedResponse(res);
      return;
    }

    checkIsAuthorized(accessToken, function(err, clientInfo) {
      if (err) {
        // Querying the Authorization Provider failed.
        next(err);
        return;
      }

      if (!clientInfo) {
        sendUnauthorizedResponse(res);
        return;
      }

      // Create client and/or user entries in the database.
      db.sequelize.transaction(function(transaction) {
        async.waterfall([
          function(callback) {
            var state = { clientInfo: clientInfo };
            createUser(state, callback);
          },
          createClient,
          function(state, callback) {
            transaction.commit().complete(function(err) {
              callback(err, state);
            });
          },
          function(state, callback) {
            // Use req.device as req.client contains the HTTP client for this
            // request
            req.device = state.client;
            req.user   = state.user;
            next();
          }
        ],
        function(error) {
          if (error) {
            transaction.rollback().complete(function() {
              next(error);
            });
          }
        });
      });
    });
  };

  return protectedResourceHandler;
};
