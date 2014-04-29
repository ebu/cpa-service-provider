"use strict";

module.exports = {
  db: {
    host: '',
    port: 3306,
    user: '',
    password: '',
    type: '',
    database: '',

    // Database filename for SQLite
    filename: '',

    // For debugging, log SQL statements to the console
    debug: true
  },

  authorization_provider: {
    name:              "Example AP",
    authorization_uri: "https://ap.example.com/authorized",
    base_uri:          "https://ap.example.com",
    modes:             ["client", "user"],

    // Access token for making authenticated requests to the authorization
    // provider
    access_token:      ""
  },

  service_provider: {
    name:  process.env.SERVICE_PROVIDER_ID || "STATION_NAME",
    scope: "https://sp.example.com/"
  }
};
