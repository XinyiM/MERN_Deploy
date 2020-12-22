const express = require('express');
const { check } = require('express-validator');
const userControllers = require("../controllers/users-controller");
const router = express.Router();
const fileUpload = require('../middleware/file-upload');

router.get("/", userControllers.getAllUsers);

router.post(
  "/signup",
  fileUpload.single('image'),
  [
    check('name').notEmpty(),
    check('email')
      .normalizeEmail()
      .isEmail(),
    check('password').isLength({ min: 6 })
  ],
  userControllers.signUp);

router.post("/login", userControllers.logIn);

module.exports = router;