"use strict";

module.exports = {
  db: {
    type: 'sqlite',

    // Database filename for SQLite
    // filename: 'data/test.sqlite',

    // For debugging, log SQL statements to the console
    debug: false
  },

  authorization_provider: {
    name:              "Example AP",
    authorization_uri: "https://ap.example.com/authorized",
    base_uri:          "https://ap.example.com",
    modes:             ["client", "user"]
  },

  service_provider: {
    name:         "BBC1",
    scope:        "https://sp.example.com/",
    // Access token for making authenticated requests to the authorization
    // provider
    access_token: "ce1a7ceda238478fabe827bacec7b8a4"
  }
};
