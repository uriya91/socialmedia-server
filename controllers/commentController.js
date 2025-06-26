const Comment = require("../models/Comment");
const Post = require("../models/Post");

const createComment = async (req, res, next) => {
  try {
    const { postId, content } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId).populate("author", "username");
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const newComment = new Comment({
      postId,
      author: userId,
      content,
    });
    await newComment.save();

    const populatedComment = await Comment.findById(newComment._id).populate(
      "author",
      "username profileImage"
    );

    res.status(201).json({
      message: "Comment created successfully",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    next(error);
  }
};

const getCommentsByPost = async (req, res, next) => {
  try {
    const postId = req.params.postId;

    const comments = await Comment.find({ postId })
      .populate("author", "username profileImage")
      .sort({ createdAt: 1 });

    res.status(200).json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    next(error);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const userId = req.user._id;
    const { content } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (!comment.author.equals(userId)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this comment" });
    }

    comment.content = content;
    await comment.save();

    res
      .status(200)
      .json({ message: "Comment updated successfully", comment });
  } catch (error) {
    console.error("Error updating comment:", error);
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (!comment.author.equals(userId)) {
      return res
        .status(403)
        .json({ message: "You can delete only your own comments" });
    }

    await comment.deleteOne();
    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    next(error);
  }
};

module.exports = {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
};
