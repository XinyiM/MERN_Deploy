const HttpError = require("../models/http-error");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user');


const getAllUsers = async (req, res, next) => {
    let users;
    try {
        //exclude the password
        users = await User.find({}, '-password');
    } catch (err) {
        return next(new HttpError(
            'Fetching users failed, please try agian later.',
            500
        ));
    }
    res.json({
        users: users.map(user =>
            user.toObject({ getters: true })
        )
    });
};

const signUp = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        // in async method, do not use throw, use next(error) instead
        return next(
            new HttpError("Invalid inputs passed, please check your data.", 422)
        );
    }
    const { name, email, password } = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({ email: email })
    } catch (err) {
        const error = new HttpError(
            'Signing up failed, please try again later.',
            500
        );
        return next(error);
    }

    if (existingUser) {
        const error = new HttpError(
            'User existing already.',
            422
        );
        return next(error);
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12); // 12 salting round.
    } catch (err) {
        const error = new HttpError('Could not create user, please try again.',
            500
        );
        return next(error);
    }

    const createdUser = new User({
        name,
        email,
        image: req.file.path,
        password: hashedPassword,
        places: []
        // when the User is created, the places is an empty array
    });

    try {
        console.log(createdUser);
        await createdUser.save();
    } catch (err) {
        const error = new HttpError(
            'Signing up failed, please try again!',
            500
        );
        return next(error);
    }

    // generate a token
    let token;
    try {
        token = jwt.sign(
            { userId: createdUser.id, email: createdUser.email },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        ); // return a token
    } catch (err) {
        const error = new HttpError(
            'Signing up failed, please try again later.',
            500
        );
        return next(error);
    }


    res
        .status(201)
        .json({
            userId: createdUser.id,
            email: createdUser.email,
            token: token
        });
};

const logIn = async (req, res, next) => {
    const { email, password } = req.body;
    let existingUser;
    try {
        existingUser = await User.findOne({ email: email })
    } catch (err) {
        const error = new HttpError(
            'Login in failed, please try again later.',
            500
        );
        return next(error);
    }
    console.log(existingUser);
    if (!existingUser) {
        const error = new HttpError(
            "Invalid credentials, can not log you in.",
            401
        );
        return next(error);
    }
    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    } catch (err) {
        const error = new HttpError('Could not log you in, please check your credentials.',
            500
        );
        return next(error);
    }

    if (!isValidPassword) {
        const error = new HttpError(
            "Invalid credentials, can not log you in.",
            401
        );
        return next(error);
    }

    let token;
    try {
        token = jwt.sign(
            { userId: existingUser.id, email: existingUser.email },
            process.env.JWT_KEY, // use the same private key
            { expiresIn: '1h' }
        ); // return a token
    } catch (err) {
        const error = new HttpError(
            'Logging in failed, please try again later.',
            500
        );
        return next(error);
    }

    console.log(existingUser.id);
    res.json({
        userId: existingUser.id,
        email: existingUser.email,
        token: token
    });
};

exports.getAllUsers = getAllUsers;
exports.signUp = signUp;
exports.logIn = logIn;