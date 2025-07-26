const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const admin = require("./firebase/firebase.config");

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://real-estate-platform-4dacc.web.app",
    ],
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
    // await client.connect(); //  DB connection

    const db = client.db("RealEstate");
    const usersCollection = db.collection("users");
    const wishlistCollection = db.collection("wishlist");
    const propertyCollection = db.collection("properties");
    const reviewsCollection = db.collection("reviews");
    const offersCollection = db.collection("offers");

    // POST: Add user
    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log("Received user:", user);
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

    // GET: All properties and filter by agent email
    app.get("/properties", async (req, res) => {
      const agentEmail = req.query.agentEmail;
      let query = {};
      if (agentEmail) {
        query = { agentEmail: agentEmail };
      }
      const result = await propertiesCollection.find(query).toArray();
      res.send(result);
    });

    // POST: Add a new property
    app.post("/properties", async (req, res) => {
      try {
        const property = req.body;

        // Default verificationStatus = "pending" jodi na thake
        if (!property.verificationStatus) {
          property.verificationStatus = "pending";
        }

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

    //-------API for ADMIN--------
    // === ADMIN USER MANAGEMENT START ===
    // GET all users
    app.get("/users", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    // PATCH: Update user role (admin/agent)
    app.patch("/users/:id/role", async (req, res) => {
      const { role } = req.body;
      const id = req.params.id;
      await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      res.send({ success: true });
    });

    // PATCH: Mark user as fraud (and remove their properties)
    app.patch("/users/:id/fraud", async (req, res) => {
      const id = req.params.id;
      // 1. Mark user as fraud
      await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "fraud" } }
      );
      // 2. Remove all properties by this agent from All Properties (set a flag or delete)
      await propertyCollection.updateMany(
        { agentId: id },
        { $set: { verificationStatus: "fraud" } }
      );
      res.send({ success: true });
    });

    //  DELETE: Remove user from DB and Firebase Auth
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;

      try {
        // 1. Get user from DB
        const user = await usersCollection.findOne({ _id: new ObjectId(id) });

        if (!user) {
          return res
            .status(404)
            .send({ success: false, message: "User not found" });
        }

        // 2. Delete user from MongoDB
        await usersCollection.deleteOne({ _id: new ObjectId(id) });

        // 3. Delete user from Firebase Auth (by email)
        try {
          const firebaseUser = await admin.auth().getUserByEmail(user.email);
          await admin.auth().deleteUser(firebaseUser.uid);
        } catch (firebaseError) {
          // If Firebase user not found, just log and continue
          console.warn(
            `Firebase user deletion failed: ${firebaseError.message}`
          );
        }

        res.send({
          success: true,
          message: "User deleted from DB and Firebase (if existed)",
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Failed to delete user",
          error: error.message,
        });
      }
    });

    // PATCH /properties/:id/verify - verify property
    app.patch("/properties/:id/verify", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await propertyCollection.updateOne(
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
        const result = await propertyCollection.updateOne(
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

    //--------AGENT API----//
    // PATCH: Update property by ID
    app.patch("/properties/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;
        const result = await propertyCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Property updated successfully" });
        } else {
          res.status(404).send({
            success: false,
            message: "Property not found or no changes",
          });
        }
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });

    // DELETE: Delete property by ID
    app.delete("/properties/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await propertyCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount > 0) {
          res.send({ success: true, message: "Property deleted successfully" });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Property not found" });
        }
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });

    // Get all offers for agent
    // app.post("/offers", async (req, res) => {
    //   const offer = req.body;

    //   // Convert propertyId to ObjectId before saving
    //   if (offer.propertyId) {
    //     offer.propertyId = new ObjectId(offer.propertyId);
    //   }

    //   try {
    //     const result = await offersCollection.insertOne(offer);
    //     res.send(result);
    //   } catch (err) {
    //     res.status(500).send({ error: "Failed to save offer", details: err });
    //   }
    // });

    // POST: Add an offer
    app.post("/offers", async (req, res) => {
      const offer = req.body;

      // Convert propertyId to ObjectId before saving
      if (offer.propertyId) {
        offer.propertyId = new ObjectId(offer.propertyId);
      }

      // Set default status to "pending" if not provided
      if (!offer.status) {
        offer.status = "pending";
      }

      try {
        const result = await offersCollection.insertOne(offer);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to save offer", details: err });
      }
    });
    // GET: All offers
    app.get("/offers", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { buyerEmail: email };
      }
      const result = await offersCollection.find(query).toArray();
      res.send(result);
    });

    // GET: All offers for agent's properties
    app.get("/offers/agent/:email", async (req, res) => {
      const email = req.params.email;
      // console.log("Agent Email from frontend:", email);

      // Get agent's properties
      const agentProperties = await propertyCollection
        .find({ agentEmail: email })
        .toArray();
      const propertyIds = agentProperties.map((p) => p._id.toString()); // <-- use string IDs

      // Find offers with matching propertyIds
      const offers = await offersCollection
        .find({ propertyId: { $in: propertyIds } })
        .toArray();

      res.send(offers);
    });

    // Get all offers for a specific agent by agentId
    app.get("/offers/agent/:agentId", async (req, res) => {
      const agentId = req.params.agentId;
      try {
        const offers = await offersCollection
          .find({ agentId: new ObjectId(agentId) })
          .toArray();
        res.send(offers);
      } catch (err) {
        res
          .status(500)
          .send({ error: "Failed to fetch offers for agent", details: err });
      }
    });

    // PATCH: Accept an offer and reject others for the same property
    // PATCH: Accept or Reject an offer (Based on the status value )
    app.patch("/offers/status/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;

        if (status === "accepted") {
          // Find the accepted offer
          const acceptedOffer = await offersCollection.findOne({
            _id: new ObjectId(id),
          });
          if (!acceptedOffer) {
            return res
              .status(404)
              .send({ success: false, message: "Offer not found" });
          }
          const propertyId = acceptedOffer.propertyId;

          // 1️⃣ Accept this offer
          await offersCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: "accepted" } }
          );

          // 2️⃣ Reject other offers for the same property
          await offersCollection.updateMany(
            { propertyId: propertyId, _id: { $ne: new ObjectId(id) } },
            { $set: { status: "rejected" } }
          );

          return res.send({
            success: true,
            message: "Offer accepted and others rejected",
          });
        } else if (status === "rejected") {
          // Just reject this offer
          await offersCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: "rejected" } }
          );
          return res.send({ success: true, message: "Offer rejected" });
        } else {
          return res
            .status(400)
            .send({ success: false, message: "Invalid status value" });
        }
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });
    // GET: Sold properties by agent email
    app.get("/sold-properties", async (req, res) => {
      const email = req.query.email;
      const result = await offersCollection
        .find({
          agentEmail: email,
          status: "bought",
        })
        .toArray();
      res.send(result);
    });

    //  DB connection test - this line must be INSIDE try block
    // await client.db("admin").command({ ping: 1 });
    // console.log(" Pinged your deployment. Connected to MongoDB!");
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
