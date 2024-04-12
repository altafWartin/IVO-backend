const mongoose = require("mongoose");

const countriesSchema = mongoose.Schema({
  id: { type: Number },
  name: { type: String },
  phone_code: { type: String },
  country_name: { type: String },
});

module.exports = mongoose.model("countries", countriesSchema);
