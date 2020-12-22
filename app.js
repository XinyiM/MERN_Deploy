const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');;
const mongoose = require('mongoose');

const placesRoutes = require("./routes/places-routes");
const userRoutes = require("./routes/users-routes");
const HttpError = require('./models/http-error');

const app = express();
 
//register middleware functions

//route certern requests to certain functions 
//that should be executed upon those requests

// parse any incoming request body and extract any JSON data, 
// convert it into reguar js Data structures and call next functions automatically
app.use(bodyParser.json());

app.use('/uploads/images', express.static(path.join('uploads', 'images')));
// just return a serving, do not execute anything

app.use((req, res, next ) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers', 
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    next(); // let the request to continue with other middlewares 
});

//use the placesRoutes as a middleware
app.use('/api/places', placesRoutes); // => /api/palces/something
app.use('/api/users', userRoutes);

//add middleware is only reached if some request that didnt get a response
app.use((req, res, next) => {
    const error = new HttpError('Could not find this route', 404);
    throw error;
});

// error handling
app.use((error, req, res, next) => {
    if(req.file){
        // delete the file
        fs.unlink(req.file.path, (err) => {
            console.log(err);
        })
    }
    if(res.headerSent){
        return next(error);
    }
    // No response has been sent
    res.status(error.code || 500);
    res.json({message: error.message || "An unknown error occured!"});
});

console.log(process.env.JWT_KEY);
console.log(process.env.DB_NAME);

mongoose
    .connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.oxhrw.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`) 
    .then(() => {
// listen on a server port
        app.listen(process.env.PORT || 5000);
        console.log("Connected Successfully!");
    })
    .catch((err) => {
        console.log("ERROR:\n");
        console.log(err);
    });
 