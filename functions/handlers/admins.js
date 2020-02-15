const { admin, db } = require("../util/admin");

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
  validateChangePassword,
  validateChangeEmail
} = require("../util/validators");
const config = require("../util/config");
const firebase = require("firebase");

//signup
exports.signupAdmin = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
    category: req.body.category
  };

  //destructuring

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

  //adding a unknown propic to every new user
  const noImg = "user-unknown.png";

  //adding a default cover pic to every new user
  //const noImg2 = "hotel.jpg";

  //assign a category

  if (newUser.category == 1) newUser.category = "Admin";

  let token, userId;

  firebase
    .auth()
    .createUserWithEmailAndPassword(newUser.email, newUser.password)

    .then(data => {
      userId = data.user.uid;

      admin
        .auth()
        .setCustomUserClaims(userId, { admin: true })
        .then(claims => {
          console.log("Admin granted");
        });

      return data.user.getIdToken();
    })
    .then(idtoken => {
      token = idtoken;

      const userCredenials = {
        handle: newUser.handle,
        email: newUser.email,
        category: newUser.category,
        createdAt: new Date().toISOString(), //make date a string
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        //imageUrlCover: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg2}?alt=media`,
        userId
      }; //creating user document
      return db.doc(`/admins/${userId}`).set(userCredenials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use" });
      } else if (err.code === "auth/weak-password") {
        return res.status(403).json({ password: "Enter a strong password" });
      } else {
        return res
          .status(500)
          .json({ general: "Somethings wrong, Please try again" });
      }
    });
  //201 resourse created
};

//login

exports.loginAdmin = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  //destructuring

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      admin
        .auth()
        .verifyIdToken(token)
        .then(claims => {
          if (claims.admin === true) {
            console.log("Admin verified");
            return res.json({ token });
          } else
            return res
              .status(500)
              .json({ general: "Somethings wrong, Please try again" });
        });
    })
    .catch(err => {
      console.log(err);
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "wrong credentials,please try again" });

        //403 unauthrized status code
      } else if (err.code === "auth/user-not-found") {
        return res
          .status(403)
          .json({ general: "Invalid email,please try again" });
      } else
        return res
          .status(500)
          .json({ general: "Somethings wrong, Please try again" });
    });
};

exports.deleteAdByAdmin = (req, res) => {
  const document = db.doc(`/ads/${req.params.adId}`);

  document
    .get()
    .then(doc => {
      if (!doc.exists)
        return res.status(404).json({ error: "No such advertisment" });
      // if (doc.data().userHandle !== req.user.handle)
      //   return res.status(403).json({ error: "Unauthorized" });
      else return document.delete();
    })
    .then(() => {
      res.json({ message: "Advertisment deleted succesfully" });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//get user details
exports.getUserAdmin = (req, res) => {
  let userData = {};

  db.doc(`/admins/${req.user.uid}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then(data => {
      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });
      return db
        .collection("notifications")
        .where("recipientAt", "==", req.user.handle)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })

    .then(data => {
      userData.notifications = [];
      data.forEach(doc => {
        userData.notifications.push({
          recipientAt: doc.data().recipientAt,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          adId: doc.data().adId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id
        });
      });
      return db
        .collection("reviews")
        .where("serviceId", "==", req.user.handle)
        .orderBy("createdAt", "desc")
        .get();
    })

    .then(data => {
      userData.reviews = [];
      data.forEach(doc => {
        userData.reviews.push({
          reviewId: doc.id,
          body: doc.data().body,
          travelerId: doc.data().travelerId,
          serviceId: doc.data().serviceId,
          createdAt: doc.data().createdAt,
          travelerImage: doc.data().travelerImage
        });
      });
      //
      return db
        .collection("ads")
        .where("userHandle", "==", req.user.handle)
        .orderBy("createdAt", "desc")
        .get();
    })
    .then(data => {
      userData.advertisments = [];
      data.forEach(doc => {
        userData.advertisments.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          adImage: doc.data().adImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          adId: doc.id
        });
      });
      return res.json(userData);
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

//add user details

exports.addUserDetailsAdmin = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/admins/${req.user.uid}`)
    .update(userDetails)
    .then(() => {
      console.log(req.user.category, req.user.handle);
      return res.json({
        message: "Details added succesfully"
      });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

//upload a profile picture
exports.uploadProfileImageAdmin = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/admins/${req.user.uid}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "image uploaded successfully" });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};

//change password with reauthentication admin

exports.changePasswordAdmin = (req, res) => {
  const userNew = {
    password: req.body.password,
    newPassword: req.body.newPassword,
    confirmPassword: req.body.confirmPassword
  };

  const { valid, errors } = validateChangePassword(userNew);

  if (!valid) return res.status(400).json(errors);

  var user = firebase.auth().currentUser;
  var credential = firebase.auth.EmailAuthProvider.credential(
    user.email,
    userNew.password
  );

  user
    .reauthenticateWithCredential(credential)
    .then(() => {
      // User re-authenticated.
      var user = firebase.auth().currentUser;
      var newPassword = userNew.newPassword;

      user
        .updatePassword(newPassword)
        .then(() => {
          // Update successful.
          return res.json({
            message: "change password succesfully"
          });
        })
        .catch(err => {
          console.log(err);
          return res
            .status(403)
            .json({ general: "Invalid password,please try again" });
        });
    })
    .catch(err => {
      console.log(err);
      return res
        .status(403)
        .json({ general: "Invalid password,please try again" });
    });
};

//change admin email
exports.changeEmailAdmin = (req, res) => {
  const userNew = {
    password: req.body.password,
    email: req.body.email
  };

  const { valid, errors } = validateChangeEmail(userNew);

  if (!valid) return res.status(400).json(errors);

  var user = firebase.auth().currentUser;
  var credential = firebase.auth.EmailAuthProvider.credential(
    user.email,
    userNew.password
  );

  user
    .reauthenticateWithCredential(credential)
    .then(() => {
      // User re-authenticated.
      var user = firebase.auth().currentUser;
      var email = userNew.email;

      user
        .updateEmail(email)
        .then(() => {
          // Update successful.
          return res.json({
            message: "change email succesfully"
          });
        })
        .catch(err => {
          console.log(err);
          return res
            .status(403)
            .json({ general: "Invalid password,please try again" });
        });
    })
    .catch(err => {
      console.log(err);
      return res
        .status(403)
        .json({ general: "Invalid password,please try again" });
    });
};

//delete admin account

exports.deleteAdmin = (req, res) => {
  const userNew = {
    password: req.body.password,
    email: req.body.email
  };

  // validatechangeEmail function use to validate because it's similar to  functionality here
  const { valid, errors } = validateChangeEmail(userNew);

  if (!valid) return res.status(400).json(errors);

  var user = firebase.auth().currentUser;
  var credential = firebase.auth.EmailAuthProvider.credential(
    userNew.email,
    userNew.password
  );

  user
    .reauthenticateWithCredential(credential)
    .then(() => {
      var user = firebase.auth().currentUser;

      user
        .delete()
        .then(() => {
          // User deleted.
          return res.json({
            message: "User deleted succesfully"
          });
        })
        .catch(err => {
          console.log(err);
          return res
            .status(403)
            .json({ general: "Invalid password,please try again" });
        });
    })
    .catch(err => {
      console.log(err);
      return res
        .status(403)
        .json({ general: "Invalid password,please try again" });
    });
};
