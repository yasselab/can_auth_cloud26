import { Sequelize, DataTypes } from "sequelize";

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false
});

export const User = sequelize.define("User", {
  name: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: DataTypes.STRING,
  role: {
    type: DataTypes.ENUM("ADMIN", "VOLUNTEER"),
    defaultValue: "VOLUNTEER"
  }
});