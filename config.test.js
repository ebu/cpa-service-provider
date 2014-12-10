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
    modes:             ["client", "user"],
    // Access token for making authenticated requests to the authorization
    // provider
    access_token:      "ce1a7ceda238478fabe827bacec7b8a4"
  },

  service_provider: {
    name:   "BBC1",
    domain: "sp.example.com"
  },

  // URL path namespace prefix
  namespace: '/sp'
};
