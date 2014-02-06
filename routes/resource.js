"use strict";

var db = require('../models');

module.exports = function(app) {
  var logger = app.get('logger');
  var config = app.get('config');

  var protectedResourceHandler =
    require('../lib/protected-resource-handler')(config, db, logger);

  app.get('/resource', protectedResourceHandler, function(req, res) {
    res.json({ message: config.service_provider_id + ' says : Hello world!'});
  });
};
