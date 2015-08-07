'use strict';

module.exports = {
  db: {
    type: 'sqlite',

    // Database filename for SQLite
    filename: 'data/cpa-service-provider.sqlite',

    // For debugging, log SQL statements to the console
    debug: true
  },

  authorization_provider: {
    name:              'Example Auth Provider',
    authorization_uri: process.env.CPA_AUTH_PROVIDER_URL + '/authorized',
    base_uri:          process.env.CPA_AUTH_PROVIDER_URL,
    modes:             ['client', 'user'],

    // Access token for making authenticated requests to the authorization
    // provider
    access_token:      'b4949eba147f4cf88985b43c039cd05b'
  },

  service_provider: {
    name:   'Example Service Provider',
    domain: process.env.CPA_SERVICE_PROVIDER_DOMAIN
  },

  // Cross-origin resource sharing
  cors: {
    enabled: true,
    allowed_domains: [
      'http://cpa-client.ebu.io'
    ]
  }
};
