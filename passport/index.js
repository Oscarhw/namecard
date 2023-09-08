const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const db = require('../models');
let helper = require("../config/helper")
const User = db.users;
const opts = {};

opts.jwtFromRequest = ExtractJWT.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.JWT_SECRET;

passport.use('user', new JWTStrategy(opts,
    async function(payload, done) {
        console.log("======== passport authentication =========", payload);
        try {
            if (!payload.data.id) {
                return done(null, false);
            }
            const existingUser = await User.findOne({
                attributes: ['id', 'user_email','user_name'],
                where: {
                    id: payload.data.id,
                    user_email: payload.data.user_email
                }
            });
            if (existingUser) {
                return done(null, existingUser.dataValues);
            }
            return done(null, false);
        } catch (e) {
            return done(null, false);
        }
    }
));

module.exports = {
    initialize: function() {
        return passport.initialize();
    },
    authenticateUser: function(req, res, next) {
        return passport.authenticate("user", { session: false }, (err, user, info) => {
            if (err) return helper.unauth(res, err);

            if (info && info.hasOwnProperty('name') && info.name == 'JsonWebTokenError')
                return helper.unauth(res, 'Invalid Token1.', {});
            else if (user == false)
                return helper.unauth(res, 'Invalid Token2.', {});

            req.user = user;
            next();
        })(req, res, next);
    },
}