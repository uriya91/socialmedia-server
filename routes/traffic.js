const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const { linkMongoUser } = require("../middleware/authMiddleware");

const groupByDayPipeline = (field) => [
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: `$${field}` },
      },
      count: { $sum: 1 },
    },
  },
  {
    $sort: { _id: 1 },
  },
  {
    $project: {
      _id: 0,
      date: "$_id",
      count: 1,
    },
  },
];

router.use(linkMongoUser);

router.get("/posts", async (req, res) => {
  try {
    const data = await Post.aggregate(groupByDayPipeline("createdAt"));
    res.json(data);
  } catch (err) {
    console.error("Error fetching posts traffic:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/comments", async (req, res) => {
  try {
    const data = await Comment.aggregate(groupByDayPipeline("createdAt"));
    res.json(data);
  } catch (err) {
    console.error("Error fetching comments traffic:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;