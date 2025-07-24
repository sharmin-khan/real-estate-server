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
    const offersCollection = db.collection("offers");

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
    // POST: Add a new property
    app.post("/properties", async (req, res) => {
      try {
        const property = req.body;

        // Validate required fields
        if (
          !property.title ||
          !property.location ||
          !property.image ||
          !property.agentName ||
          !property.agentEmail ||
          !property.priceMin ||
          !property.priceMax
        ) {
          return res.status(400).send({ error: "All fields are required." });
        }

        const result = await propertyCollection.insertOne(property);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to add property", details: err });
      }
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

    // // GET: Reviews by user email
    // app.get("/reviews", async (req, res) => {
    //   const email = req.query.email;
    //   if (!email) {
    //     return res
    //       .status(400)
    //       .send({ error: "Email query parameter is required" });
    //   }
    //   try {
    //     const result = await reviewsCollection
    //       .find({ userEmail: email })
    //       .toArray();
    //     res.send(result);
    //   } catch (err) {
    //     res
    //       .status(500)
    //       .send({ error: "Failed to fetch reviews", details: err });
    //   }
    // });

    // ✅ GET: Latest 3 user reviews with user info and property title
    app.get("/reviews", async (req, res) => {
      if (req.query.latest) {
        const latest = parseInt(req.query.latest);
        try {
          const result = await reviewsCollection
            .find({})
            .sort({ time: -1 })
            .limit(latest)
            .toArray();
          return res.send(result);
        } catch (err) {
          return res
            .status(500)
            .send({ error: "Failed to fetch latest reviews", details: err });
        }
      }

      // Existing user email filter
      const email = req.query.email;
      if (email) {
        try {
          const result = await reviewsCollection
            .find({ userEmail: email })
            .toArray();
          return res.send(result);
        } catch (err) {
          return res
            .status(500)
            .send({ error: "Failed to fetch reviews", details: err });
        }
      }

      // **Default: return all reviews if no query param**
      try {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
      } catch (err) {
        res
          .status(500)
          .send({ error: "Failed to fetch reviews", details: err });
      }
    });

    // POST: Add a review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    // DELETE: Delete a review by id
    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await reviewsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (err) {
        res
          .status(500)
          .send({ error: "Failed to delete review", details: err });
      }
    });

    // POST: Save review with createdAt
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      review.time = new Date(); // ✅ current time set
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    // POST: Add an offer
    app.post("/offers", async (req, res) => {
      const offer = req.body;
      try {
        const result = await offersCollection.insertOne(offer);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to save offer", details: err });
      }
    });

    // GET: Offers by buyer email
    app.get("/offers", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res
          .status(400)
          .send({ error: "Email query parameter is required" });
      }
      try {
        const result = await offersCollection
          .find({ buyerEmail: email })
          .toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to fetch offers", details: err });
      }
    });

    //-------API for Admin--------
    // PATCH /properties/:id/verify - verify property
    app.patch("/properties/:id/verify", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await propertiesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { verificationStatus: "verified" } }
        );
        res.json({ message: "Property verified", result });
      } catch (err) {
        res
          .status(500)
          .json({ message: "Failed to verify property", error: err.message });
      }
    });

    // PATCH /properties/:id/reject - reject property
    app.patch("/properties/:id/reject", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await propertiesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { verificationStatus: "rejected" } }
        );
        res.json({ message: "Property rejected", result });
      } catch (err) {
        res
          .status(500)
          .json({ message: "Failed to reject property", error: err.message });
      }
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
