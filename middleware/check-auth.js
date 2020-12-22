const HttpError = require("../models/http-error");
const jwt = require('jsonwebtoken');


module.exports = (req, res, next) => {
    // store the token in the header
    if(req.method === 'OPTIONS'){
        return next();
    } // this fixed the bug of net::ERR_FAILED.
    try {
        const token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bear TOKEN'
        if (!token) {
            throw new HttpError('Authentication fails!');
        }
        // validating the token
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        // once finished add the userdata to the request.
        req.userData = { userId: decodedToken.userId };
        next();
    } catch (err) {
        const error = new HttpError(
            'Authentication failed!',
            401
        );
        return next(error);
    }



}