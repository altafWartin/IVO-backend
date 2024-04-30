const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const citiesSchema = mongoose.Schema({
  id: { type: Number },
  name: { type: String },
  state_name: { type: String },
  country_name: { type: String },
});

module.exports = mongoose.model("cities", citiesSchema);
