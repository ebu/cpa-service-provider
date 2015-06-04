"use strict";

module.exports = function(sequelize, DataTypes) {
  var Tag = sequelize.define('Tag', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false
    },
    bearer: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true
      }
    },
    time: {
      type: DataTypes.DATE
    },
    time_source: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    underscored: true,

    associate: function(models) {
      Tag.belongsTo(models.Client);
    }
  });

  return Tag;
};
