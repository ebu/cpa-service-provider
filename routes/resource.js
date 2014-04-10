"use strict";

var db = require('../models');

module.exports = function(app) {
  var logger = app.get('logger');
  var config = app.get('config');

  var protectedResourceHandler =
    require('../lib/protected-resource-handler')(config, db, logger);

  /**
   * Example protected resource endpoint, which simply returns a greeting
   * to the client or user.
   */

  app.get('/resource', protectedResourceHandler, function(req, res) {
    var message = config.service_provider.name + " says: Hello ";

    if (req.user) {
      var user = req.user.display_name;

      if (!user) {
        user = "user " + req.user.id;
      }

      message += user + "!";
    }
    else if (req.device) {
      message += "client " + req.device.id + "!";
    }
    else {
      // Shouldn't get here.
      message += "unknown client!";
    }

    res.json({ message: message });
  });
};
