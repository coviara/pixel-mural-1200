const mongoose = require("mongoose");

const spaceSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  width: Number,
  height: Number,
  buyerEmail: String,
  status: { type: String, default: "pending" },
  paymentId: String,
  imageUrl: String, // <--- Nueva línea
  link: String      // Opcional: Para que al hacer clic los lleve a su web
});

module.exports = mongoose.model("Space", spaceSchema);
