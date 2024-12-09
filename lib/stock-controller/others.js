require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../../models/Product");

// MongoDB connection setup
const mongo_connection = mongoose.createConnection(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // keepAlive: true,
  maxPoolSize: 100, // `poolSize` replaced with `maxPoolSize` in newer MongoDB drivers
  connectTimeoutMS: 10000,
  socketTimeoutMS: 30000,
});

// Ensure MongoDB connection is working
mongo_connection.on("connected", () => {
  console.log("MongoDB connected successfully!");
});

mongo_connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

mongo_connection.on("disconnected", () => {
  console.log("MongoDB connection disconnected!");
});

// Handle product quantity updates after an order is created
const handleProductQuantity = async (cart) => {
  try {
    for (const p of cart) {
      if (p?.isCombination) {
        // Update specific variant within a product
        await Product.findOneAndUpdate(
            {
              _id: p._id,
              "variants.productId": p?.variant?.productId || "",
            },
            {
              $inc: {
                stock: -p.quantity,
                "variants.$.quantity": -p.quantity,
                sales: p.quantity,
              },
            },
            { new: true } // Returns the updated document
        );
      } else {
        // Update the stock and sales for a non-combination product
        await Product.findOneAndUpdate(
            {
              _id: p._id,
            },
            {
              $inc: {
                stock: -p.quantity,
                sales: p.quantity,
              },
            },
            { new: true }
        );
      }
    }
  } catch (err) {
    console.error("Error in handleProductQuantity:", err.message);
  }
};

// Handle product attribute updates (e.g., removing specific attributes)
const handleProductAttribute = async (key, value, multi) => {
  try {
    // Retrieve all products with combinations
    const products = await Product.find({ isCombination: true });

    if (multi) {
      // Remove attributes for multiple values
      for (const p of products) {
        await Product.updateOne(
            { _id: p._id },
            {
              $pull: {
                variants: { [key]: { $in: value } }, // Matches multiple values
              },
            }
        );
      }
    } else {
      // Remove attributes for a single value
      for (const p of products) {
        await Product.updateOne(
            { _id: p._id },
            {
              $pull: {
                variants: { [key]: value }, // Matches a single value
              },
            }
        );
      }
    }
  } catch (err) {
    console.error("Error in handleProductAttribute:", err.message);
  }
};

module.exports = {
  handleProductQuantity,
  handleProductAttribute,
};
