class HttpError extends Error{
    constructor(message, erroeCode) {
        super(message); //Add a "message" property
        this.code = erroeCode; // Add a "Code" property
    }
}

module.exports = HttpError;