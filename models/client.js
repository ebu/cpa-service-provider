"use strict";

module.exports = function(sequelize, DataTypes) {
  var Client = sequelize.define('Client', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
  }, {
    underscored: true,

    associate: function(models) {
      Client.belongsTo(models.User);
      Client.hasMany(models.Tag);
    }
  });

  return Client;
};
