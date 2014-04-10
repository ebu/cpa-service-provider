"use strict";

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    display_name: DataTypes.STRING
  }, {
    underscored: true,

    associate: function(models) {
      User.hasMany(models.Client);
    }
  });

  return User;
};
