const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

//Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0eyhim6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("RealEstate");
    const usersCollection = db.collection("users");
    const wishlistCollection = db.collection("wishlist");
    const propertyCollection = db.collection("properties");

    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });
      // console.log("Received user:", user);

      if (existingUser) {
        return res.send({ message: "User already exists" });
      }

      const result = await usersCollection.insertOne(user);
      // console.log("Insert result:", result);
      res.send(result);
    });

    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      if (user) {
        res.send({ role: user.role });
      } else {
        res.status(404).send({ message: "User not found" });
      }
    });

    // Add to Wishlist
    app.post("/wishlist", async (req, res) => {
      const wishlistItem = req.body;

      const exists = await wishlistCollection.findOne({
        propertyId: wishlistItem.propertyId,
        userEmail: wishlistItem.userEmail,
      });

      if (exists) {
        return res.send({ message: "already exists" });
      }

      const result = await wishlistCollection.insertOne(wishlistItem);
      res.send(result);
    });

    // Get all properties
    app.get("/properties", async (req, res) => {
      const result = await propertyCollection.find().toArray();
      res.send(result);
    });

    // Get single property (for details page)
    app.get("/properties/:id", async (req, res) => {
      const id = req.params.id;
      const property = await propertyCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(property);
    });

    app.post("/wishlist", async (req, res) => {
      const wishlistItem = req.body;

      // Check if already added by same user for same property
      const exists = await wishlistCollection.findOne({
        propertyId: wishlistItem.propertyId,
        email: wishlistItem.email,
      });

      if (exists) {
        return res.send({ message: "Already in wishlist" });
      }

      const result = await wishlistCollection.insertOne(wishlistItem);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
