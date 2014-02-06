"use strict";

exports.db = {
  type: 'sqlite',

  // Database filename for SQLite
  // filename: 'data/test.sqlite',

  // For debugging, log SQL statements to the console
  debug: false
};

exports.uris = {
  authorization_uri: "http://ap.example.com/authorized",
  authorization_provider_base_uri: "http://ap.example.com"
};

exports.service_provider_id = 'BBC1';
