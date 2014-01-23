"use strict";

exports.db = {
  host: '',
  port: 3306,
  user: '',
  password: '',
  type: 'sqlite',

  // Database filename for SQLite
  filename: 'data/test.sqlite',

  // For debugging, log SQL statements to the console
  debug: true
};

exports.uris = {
  authorization_uri: "http://example.com/authorized"
};

exports.service_provider_id = "example_service_provider";
