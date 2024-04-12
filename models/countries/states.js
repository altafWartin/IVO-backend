const mongoose = require("mongoose");

const statesSchema = mongoose.Schema({
  id: { type: Number },
  name: { type: String },
  country_name: { type: String },
});

module.exports = mongoose.model("state", statesSchema);
