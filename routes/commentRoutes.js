const express = require("express");
const {
    createComment,
    getCommentsByPost,
    updateComment,
    deleteComment,
} = require("../controllers/commentController");
const { linkMongoUser } = require("../middleware/authMiddleware");
const {
    validateCommentCreation,
    validateCommentUpdate,
} = require("../middleware/validateMiddleware");

const controller = require("../controllers/commentController");
const middleware = require("../middleware/authMiddleware");
const validate = require("../middleware/validateMiddleware");


const router = express.Router();

router.post("/", linkMongoUser, validateCommentCreation, createComment);

router.get("/post/:postId", linkMongoUser, getCommentsByPost);

router.put("/:id", linkMongoUser, validateCommentUpdate, updateComment);

router.delete("/:id", linkMongoUser, deleteComment);

module.exports = router;
