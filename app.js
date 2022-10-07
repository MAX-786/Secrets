//jshint esversion:6
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.set('view engine', 'ejs');


// ------------------------------
// # MongoDB database management
// ------------------------------

mongoose.connect("mongodb://0.0.0.0:27017/userDB", { useNewUrlParser: true });

const UserSchema = new mongoose.Schema({
    email: String,
    password: String
});

const User = mongoose.model("User", UserSchema);


// --------------------------
// # GET request handlers
// --------------------------

app.get("/", function(req, res) {

    res.render("home");

});

app.get("/register", function(req, res) {

    res.render("register");

});

app.get("/login", function(req, res) {

    res.render("login");

});


// --------------------------
// # POST request handlers
// --------------------------

app.post("/register", (req, res) => {

    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {

        const newUser = new User({
            email: req.body.username,
            password: hash
        });

        newUser.save((err) => {
            if (err) {
                console.log(err);
            } else {
                res.render("secrets");
            }
        });

    });


});

app.post("/login", (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    User.findOne({ email: username }, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, (err, result) => {
                    if (result) {

                        res.render("secrets");
                    }
                });

            }
        }
    });

});


app.listen(3000, () => {
    console.log("connected to port 3000!");
});