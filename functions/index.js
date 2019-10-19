const functions = require("firebase-functions");

const express = require("express");
const app = express();

const FBAuth = require("./util/fbAuth");
const { db } = require("./util/admin");
const { getAllScreams, postOneScream } = require("./handlers/screams");

const {
  getAllAds,
  postOneAd,
  deleteAd,
  getAd,
  commentOnAd,
  likeAd,
  unlikeAd,
  uploadAdImage,
  postAdWithImg,
  uploadOnlyAdImage
} = require("./handlers/ads");

const {
  signup,
  login,
  uploadProfileImage,
  uploadCoverImage,
  addUserDetails,
  getUser,
  getUserDetails,
  readNotification,
  resetPassword
} = require("./handlers/users");

const { getAllReviews, postOneReview } = require("./handlers/reviews");

// scream routes
app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, postOneScream);

// reviews routes
app.get("/reviews", getAllReviews);
app.post("/review/:serviceId/:travelerId", postOneReview);

// advertisment routes
app.get("/ads", getAllAds);
//post only ad body-caption
app.post("/ad", FBAuth, postOneAd);
app.get("/ad/:adId", getAd);
//delete Ad
app.delete("/ad/:adId", FBAuth, deleteAd);
//Like Ad
app.get("/ad/:adId/like", FBAuth, likeAd);
//Unlike Ad
app.get("/ad/:adId/unlike", FBAuth, unlikeAd);
//comment Ad not in class though
app.post("/ad/:adId/comment", FBAuth, commentOnAd);
//add image
app.post("/ad/:adId/image", FBAuth, uploadAdImage);
//post ad with image
app.post("/advertisment", FBAuth, postAdWithImg);
//post only ad image
app.post("/adImage", FBAuth, uploadOnlyAdImage);

//users routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/imagePro", FBAuth, uploadProfileImage);
app.post("/user/imageCover", FBAuth, uploadCoverImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getUser);
app.get("/user/:handle", FBAuth, getUserDetails);
app.post("/notification", FBAuth, readNotification);
app.post("/user/reset", resetPassword);

//routes are in app
//https://baseurl.com/api/...
exports.api = functions.https.onRequest(app);

//---db trigers---

//notifications
exports.createNotificationOnLike = functions
  .region("asia-east2")
  .firestore.document("likes/{id}")
  .onCreate(snapshot => {
    //snapshot=likes document
    return db
      .doc(`/ads/${snapshot.data().adId}`) //doc=advertisment
      .get()
      .then(doc => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipientAt: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "like",
            read: false,
            adId: doc.id
          });
        }
      })

      .catch(err => {
        console.error(err);
      });
  });

exports.createNotificationOnLComment = functions
  .region("asia-east2")
  .firestore.document("comments/{id}")
  .onCreate(snapshot => {
    return db
      .doc(`/ads/${snapshot.data().adId}`)
      .get()
      .then(doc => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipientAt: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "comment",
            read: false,
            adId: doc.id
          });
        }
      })

      .catch(err => {
        console.error(err);
        return;
      });
  });

exports.deleteNotificationOnUnLike = functions
  .region("asia-east2")
  .firestore.document("likes/{id}")
  .onDelete(snapshot => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch(err => {
        console.error(err);
        return;
      });
  });

//change ads user image when pro pic change trigger
exports.onProPicChange = functions
  .region("asia-east2")
  .firestore.document("/users/{userId}")
  .onUpdate(change => {
    //2 properties
    //before and after
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      const batch = db.batch();

      return db
        .collection("ads")
        .where("userHandle", "==", change.before.data().handle)
        .get()
        .then(data => {
          data.forEach(doc => {
            const ad = db.doc(`/ads/${doc.id}`);
            batch.update(ad, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });

//when delete a ad delete related data such as likes etc

exports.onAdDelete = functions
  .region("asia-east2")
  .firestore.document("ads/{adId}")
  .onDelete((snapshot, context) => {
    const adId = context.params.adId;
    const batch = db.batch();

    return db
      .collection("comments")
      .where("adId", "==", adId)
      .get()
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db
          .collection("likes")
          .where("adId", "==", adId)
          .get();
      })

      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("adId", "==", adId)
          .get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
        //also need to delete ad image
      })
      .catch(err => {
        console.log(err);
      });
  });
