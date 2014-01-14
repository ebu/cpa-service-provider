"use strict";

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('User', {
    username: DataTypes.STRING
  }, {
    associate: function(models) {
      User.hasMany(models.Task);
    }
  });

  return User;
};
