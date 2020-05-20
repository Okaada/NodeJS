const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.json');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader)
        return res.status(400).send({ error: `This request faild because there isn't a token` });

    const parts = authHeader.split(' ');

    if (!parts.length === 2)
        return res.status(401).send({ error: 'Token Error' })

    const [scheme, token] = parts;

    //REGEX FOLLOWING THIS PATTERN
    //BARS -- START AND END
    //^ -- INDICATE THE START OF VERIFICATION 
    //$ TO INDICATE THE END
    if (!/^Bearer$/i.test(scheme))
        return res.status(401).send({ error: 'Bad formatted token' });

    jwt.verify(token, authConfig.secret, (err, decoded) => {
        if (err)
            res.status(401).send({ error: "Invalid Token" })
        req.userId = decoded.id;

        return next();
    })

};