const fs = require('fs');
const HttpError = require("../models/http-error");
const { validationResult } = require('express-validator');
const getCoordsForAddress = require("../util/location");
const Place = require('../models/place');
const User = require('../models/user');
const mongoose = require('mongoose');


// Middleware Functions Controllers
const getPlaceById = async (req, res, next) => {
    // console.log("GET Request in Places");
    // const place = DUMMY_PLACES.find((p) => {
    //     return p.id === placeId;
    // });
    // const error = new Error("Could not find a place for the provided id.");
    // error.code = 404;
    // throw error; // trigger the error handling 
    // // do not return
    // 1. Place is a mongoose object, turn it into javascript object
    // 2. remove the underscore from the _id
    // send response containing JSON format
    // res.json({message: 'It Works!'});
    const placeId = req.params.pid; // { pid: 'p1' }
    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not find a place.',
            500
        );
        return next(error);
    }

    if (!place) {
        const error = new HttpError(
            'Could not find a place for the provided id.',
            404
        );
        return next(error);
    }
    res.json({ place: place.toObject({ getters: true }) });
}


const getPlacesbyUserId = async (req, res, next) => {
    const userId = req.params.uid;
    let places;
    try {
        places = await Place.find({ creator: userId });
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not find a place.',
            500
        );
        return next(error);
    }

    if (!places || places.length === 0) {
        const error = new HttpError(
            'Could not find a place for the provided id.',
            404
        );
        //   return next(error);
    }
    res.json({ places: places.map(place => place.toObject({ getters: true })) });
};

const createPlace = async (req, res, next) => {
    console.log(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // in async functions, you should use next but not throw
        next(new HttpError("Invalid inputs passed, please check your data.", 422));
    }
    //get data from post request body.
    const { title, description, address } = req.body;

    // use await when call an async function
    let coordinates;
    // handle error in an async way => wrap this into try/catch block
    try {
        coordinates = await getCoordsForAddress(address);
    } catch (error) {
        return next(error);
    }

    // Just a shortcut for const title = req.body.title;
    const createdPlace = new Place({
        title,
        description,
        image: req.file.path,
        address,
        location: coordinates,
        creator: req.userData.userId // get the userId from the CheckAuth userData
    });

    let user;
    try {
        user = await User.findById(req.userData.userId);
    } catch (err) {
        const error = new HttpError(
            'Creating place failed, please try again.',
            500
        );
        return next(error);
    }
    if (!user) {
        return next(new HttpError("Could not find the user for the provided id."));
    }

    try {
        //transaction and session
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session: sess });
        user.places.push(createdPlace);
        await user.save({ session: sess }) // this operation should be part of the session
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError(
            'Transaction roll back! Creating place failed, please try again!',
            500
        );
        return next(error);
    }
    res.status(201).json({ place: createdPlace }); // 201 is code when sth is created on the server
    // 200 is the normal success code

};

const updatePlaceById = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors);
        return next(new HttpError("Invalid inputs passed, please check your data.", 422));
    }
    // only allowed to update description and title
    const { title, description } = req.body;
    const placeId = req.params.pid;
    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        const error = new HttpError(
            "Something went wrong, cannot update the place!", 500
        );
        return next(error);
    }
    if (place.creator.toString() !== req.userData.userId) {
        const error = new HttpError(
            'You are not allowed to edit this place.',
            403
        );
        return next(error);
    }

    place.title = title;
    place.description = description;

    try {
        await place.save();
    } catch (err) {
        const error = new HttpError(
            "Something went wrong, cannot update the place!", 500
        );
        return next(error);
    }

    res.status(200).json({ place: place.toObject({ getters: true }) });

};

const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;
    let place;
    try {
        //which lets you reference documents in other collections.
        place = await Place.findById(placeId).populate('creator');
    } catch (err) {
        const error = new HttpError(
            "Something went wrong, cannot delete the place.",
            500
        );
        return next(error);
    }
    if (!place) {
        const error = new HttpError('Could not find the place for this id.', 404);
        return next(error);
    }
    const imagePath = place.image;

    if(place.creator.id !== req.userData.userId){
        const error = new HttpError(
            'You are not allowed to delete this place.',
            403
        );
        return next(error);
    }
    try {
        // Dont forget await startSession!!!
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.remove({ session: sess });
        place.creator.places.pull(place);
        await place.creator.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError(
            "Something went wrong, cannot delete the place.",
            500
        );
        return next(error);
    }
    fs.unlink(imagePath, (err) => {
        console.log(err);
    })
    res.status(200).json({ message: "Deleted Place." });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesbyUserId = getPlacesbyUserId;
exports.createPlace = createPlace;
exports.updatePlaceById = updatePlaceById;
exports.deletePlace = deletePlace;