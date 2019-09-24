const { db } = require("../util/admin");
const config = require("../util/config");

const firebase = require("firebase");

firebase.initializeApp(config);

const { validateSignupData, validateLoginData } = require("../util/validators");

//signup
exports.signup = (req, res) => {
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

  let token, userId;

  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return res.status(400).json({ handle: "this name is already taken" }); //unique name for each service so check whether unique or not
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idtoken => {
      token = idtoken;

      const userCredenials = {
        handle: newUser.handle,
        email: newUser.email,
        category: newUser.category,
        createdAt: new Date().toISOString(), //make date a string
        userId
      }; //creating user document
      return db.doc(`/users/${newUser.handle}`).set(userCredenials);
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
        return res.status(500).json({ error: err.code });
      }
    });
  //201 resourse created
};

//login

exports.login = (req, res) => {
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
      return res.json({ token });
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
      } else return res.status(500).json({ error: err.code });
    });
};
