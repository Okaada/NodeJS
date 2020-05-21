const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authToken = require('../../config/auth.json');
const mailer = require('../../modules/mailer');

const User = require('../models/User');

const router = express.Router();

function generateToken(params = {}) {
    return jwt.sign(params, authToken.secret, {
        expiresIn: 86400,
    });
}


router.post('/register', async (req, res) => {
    const { email } = req.body;
    try {
        if (await User.findOne({ email }))
            return res.status(400).send({ error: 'This email already exists' });

        const user = await User.create(req.body);

        user.password = undefined;

        return res.send({ user, token: generateToken({ id: user.id }) })
    } catch (err) {
        return res.status(400).send({ error: 'Failed to register' });

    }
});

router.post('/authenticate', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password')

    if (!user)
        res.status(400).send({ error: `User can't be found` })

    if (!await bcrypt.compare(password, user.password))
        res.status(400).send({ error: 'Wrong Password' });

    user.password = undefined;

    res.send({ 
        user, 
        token: generateToken({ id: user.id })});

})

router.post('/forgotPassword', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user)
            return res.status(400).send({ error: 'User not found' })

        const token = crypto.randomBytes(20).toString('hex');

        const expiration = new Date();
        expiration.setHours(expiration.getHours() + 1);

        await User.findByIdAndUpdate(user.id, {
            '$set': {
                passwordResetToken: token,
                passwordResetExpires: expiration,
            },
        });
        mailer.sendMail({
            to: email,
            from: 'mensageiro@node.com.br',
            template: '/forgot',
            context: { token }
        }, (err) => {
            if (err) {
                return res.status(400).send({ error: 'Cannot send email' });
            }

            return res.send();
        })

    } catch (error) {
        return res.status(400).send({ error: 'Error on forgot password' })
    }
})

router.post('/reset', async (req, res) => {
    const { email, token, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+passwordResetToken passwordResetExpires');

        if (!user)
            return res.status(400).send({ error: 'User not found' })

        if (token !== user.passwordResetToken)
            return res.status(400).send({ error: 'Invalid Token' })

        const now = new Date();
        if (now > user.passwordResetExpires)
            return res.status(400).send({ error: 'Expired Token' })

        user.password = password;

        await user.save();

        res.send();
    } catch (error) {
        return res.status(400).send({ error: 'Error' })

    }
})

module.exports = app => app.use('/auth', router);