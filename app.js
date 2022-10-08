//jshint esversion:6
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.set('view engine', 'ejs');

app.use(session({
    secret: "My little secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// ------------------------------
// # MongoDB database management
// ------------------------------

mongoose.connect("mongodb://0.0.0.0:27017/userDB", { useNewUrlParser: true });

const UserSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(findOrCreate);

const User = mongoose.model("User", UserSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, {
            id: user.id,
            username: user.username,

        });
    });
});

passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user);
    });
});

// -------------------------
// # Google OAuth2.0
// ------------------------

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        // userProfileURL: "https://www.google.com/oauth2/v3/userinfo" (ALREADY ENABLED GOOGLE+ API FROM DEV DASHBOARD)
    },
    function(accessToken, refreshToken, profile, cb) {

        // console.log(profile);

        User.findOrCreate({ googleId: profile.id }, function(err, user) {
            return cb(err, user);
        });
    }
));

// -------------------------
// # Facebook OAuth
// ------------------------

passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "http://localhost:3000/auth/facebook/secrets"
    },
    function(accessToken, refreshToken, profile, cb) {

        console.log(profile);

        User.findOrCreate({ facebookId: profile.id }, function(err, user) {
            return cb(err, user);
        });
    }
));

// --------------------------
// # GET request handlers
// --------------------------

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect('/secrets');
    });

app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect('/secrets');
    });


app.get("/", function(req, res) {

    res.render("home");

});

app.get("/register", function(req, res) {

    res.render("register");

});

app.get("/login", function(req, res) {

    res.render("login");

});

app.get("/secrets", function(req, res) {

    User.find({ "secret": { $ne: null } }, (err, foundUsers) => {
        if (err) {
            console.log(err);
        } else {
            // console.log(foundUsers);
            res.render("secrets", { UsersWtihsecrets: foundUsers });
        }
    });

});

app.get("/submit", (req, res) => {

    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }

});


app.get("/logout", (req, res, next) => {

    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// --------------------------
// # POST request handlers
// --------------------------

app.post("/register", (req, res) => {

    User.register({ username: req.body.username }, req.body.password, function(err, user) {

        if (err) {
            console.log(err);
            res.redirect("/");
        } else {
            passport.authenticate("local")(req, res, function() {

                res.redirect("/secrets");

            });
        }

    });

});

app.post("/login", (req, res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.login(user, (err) => {

        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, () => {

                res.redirect("/secrets");

            });
        }

    });
});

app.post("/submit", (req, res) => {

    const submittedSecret = req.body.secret;
    // console.log(req.user);

    User.findById(req.user.id, (err, foundUser) => {

        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(() => {
                    res.redirect("/secrets");
                });
            }
        }

    });


});




app.listen(3000, () => {
    console.log("connected to port 3000!");
});