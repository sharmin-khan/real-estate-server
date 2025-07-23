const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0eyhim6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect(); //  DB connection

    const db = client.db("RealEstate");
    const usersCollection = db.collection("users");
    const wishlistCollection = db.collection("wishlist");
    const propertyCollection = db.collection("properties");
    const reviewsCollection = db.collection("reviews");

    // POST: Add user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // GET: User role
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      if (user) {
        res.send({ role: user.role });
      } else {
        res.status(404).send({ message: "User not found" });
      }
    });

    // POST: Add to wishlist
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

    // GET: All properties
    app.get("/properties", async (req, res) => {
      const result = await propertyCollection.find().toArray();
      res.send(result);
    });

    // GET: Single property
    app.get("/properties/:id", async (req, res) => {
      const id = req.params.id;
      const property = await propertyCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(property);
    });

    //  GET: Wishlist by email
    app.get("/wishlist/:email", async (req, res) => {
      const email = req.params.email;
      // console.log("Wishlist fetch for:", email); // debug log
      const result = await wishlistCollection
        .find({ $or: [{ userEmail: email }, { email: email }] })
        .toArray();
      // console.log("Wishlist result:", result); // debug log
      res.send(result);
    });

    // GET: Reviews for a property
    app.get("/reviews/:propertyId", async (req, res) => {
      const { propertyId } = req.params;
      const reviews = await reviewsCollection.find({ propertyId }).toArray();
      res.send(reviews);
    });

    // POST: Add a review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    //  DB connection test - this line must be INSIDE try block
    await client.db("admin").command({ ping: 1 });
    console.log(" Pinged your deployment. Connected to MongoDB!");
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

// Default route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));
