"use strict";

exports.db = {
  type: 'sqlite',

  // Database filename for SQLite
  // filename: 'data/test.sqlite',

  // For debugging, log SQL statements to the console
  debug: false
};

exports.authorization_provider = {
  name:              "Example AP",
  authorization_uri: "https://ap.example.com/authorized",
  base_uri:          "https://ap.example.com",
  modes:             ["client", "user"]
};

exports.service_provider_id = 'BBC1';
