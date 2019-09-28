const functions = require("firebase-functions");

const express = require("express");
const app = express();

const FBAuth = require("./util/fbAuth");

const { getAllScreams, postOneScream } = require("./handlers/screams");
const {
  signup,
  login,
  uploadProfileImage,
  uploadCoverImage,
  addUserDetails,
  getUser
} = require("./handlers/users");

// reviews routes
app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, postOneScream);

//users routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/imagePro", FBAuth, uploadProfileImage);
app.post("/user/imageCover", FBAuth, uploadCoverImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getUser);

exports.api = functions.https.onRequest(app);

//routes are in app
//https://baseurl.com/api/...
