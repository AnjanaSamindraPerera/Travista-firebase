const { db, admin } = require("../util/admin");
const config = require("../util/config");

exports.getAllAds = (req, res) => {
  db.collection("ads")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let ads = []; //to store ad collection docs
      data.forEach(doc => {
        ads.push({
          adId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage,
          adImage: doc.data().adImage
        }); //doc is a refference.to access data we use that function
      });

      return res.json(ads);
    })
    .catch(err => console.error());
};

exports.postOneAd = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }

  const newAd = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };

  admin
    .firestore()
    .collection("ads")
    .add(newAd) //get json object ->add
    .then(doc => {
      const resAd = newAd;
      resAd.adId = doc.id;
      res.json(resAd);
    })
    .catch(err => {
      res.status(500).json({ error: "something wrong" }); //500 status code because server error
      console.log(err);
    });
};

//add image to advertisment
exports.uploadAdImage = (req, res) => {
  console.log(req.params.adId);
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
        const adImage = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/ads/${req.params.adId}`).update({ adImage });
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

//get one add
exports.getAd = (req, res) => {
  let adData = {};

  db.doc(`/ads/${req.params.adId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Advertisment not found" });
      }
      adData = doc.data();
      adData.adId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("adId", "==", req.params.adId)
        .get();
    })

    .then(data => {
      adData.comments = [];
      data.forEach(doc => {
        adData.comments.push(doc.data());
      });

      return res.json(adData);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: err.code });
    });
};

//post one comment by services
//if you need travelers that function belong to traveler

exports.commentOnAd = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({ comment: "Must not be empty" });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    adId: req.params.adId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  };

  console.log(newComment);
  db.doc(`/ads/${req.params.adId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Advertisment not found" });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment); //create a document
    })
    .then(() => {
      res.json(newComment);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: "Posting coments did not work" });
    });
};

//like a advertisment

exports.likeAd = (req, res) => {
  //spread properties ,maximum 4mb per document in fb
  console.log("helloooo");
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("adId", "==", req.params.adId)
    .limit(1);

  const adDocument = db.doc(`/ads/${req.params.adId}`);
  let adData;

  adDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        adData = doc.data();
        adData.adId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Ad not found" });
      }
    })

    .then(data => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            adId: req.params.adId,
            userHandle: req.user.handle
          })

          .then(() => {
            adData.likeCount++;
            return adDocument.update({ likeCount: adData.likeCount });
          })
          .then(() => {
            return res.json(adData);
          });
      } else {
        return res.status(400).json({ error: "Advertisment alredy liked" });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unlikeAd = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("adId", "==", req.params.adId)
    .limit(1);

  const adDocument = db.doc(`/ads/${req.params.adId}`);
  let adData;

  adDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        adData = doc.data();
        adData.adId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Ad not found" });
      }
    })

    .then(data => {
      if (data.empty) {
        return res.status(400).json({ error: "Advertisment not liked" });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            adData.likeCount--;
            return adDocument.update({ likeCount: adData.likeCount });
          })
          .then(() => {
            res.json(adData);
          });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: err.code });
    });
};

//like document without users just count

// exports.likeAd = (req, res) => {
//   //spread properties ,maximum 4mb per document in fb

//   const adDocument = db.doc(`/ads/${req.params.adId}`);
//   let adData;

//   adDocument
//     .get()
//     .then(doc => {
//       if (doc.exists) {
//         adData = doc.data();
//         adData.adId = doc.id;
//       } else {
//         return res.status(404).json({ error: "Ad not found" });
//       }
//     })
//     .then(() => {
//       adData.likeCount++;
//       return adDocument.update({ likeCount: adData.likeCount });
//     })
//     .then(() => {
//       return res.json(adData);
//     })
//     .catch(err => {
//       console.log(err);
//       res.status(500).json({ error: err.code });
//     });
// };

// //unlike ad without user details

// exports.unlikeAd = (req, res) => {
//   //spread properties ,maximum 4mb per document in fb

//   const adDocument = db.doc(`/ads/${req.params.adId}`);
//   let adData;

//   adDocument
//     .get()
//     .then(doc => {
//       if (doc.exists) {
//         adData = doc.data();
//         adData.adId = doc.id;
//       } else {
//         return res.status(404).json({ error: "Ad not found" });
//       }
//     })
//     .then(() => {
//       adData.likeCount--;
//       return adDocument.update({ likeCount: adData.likeCount });
//     })
//     .then(() => {
//       return res.json(adData);
//     })
//     .catch(err => {
//       console.log(err);
//       res.status(500).json({ error: err.code });
//     });
// };

//delete advertisment

exports.deleteAd = (req, res) => {
  const document = db.doc(`/ads/${req.params.adId}`);

  document
    .get()
    .then(doc => {
      if (!doc.exists)
        return res.status(404).json({ error: "No such advertisment" });

      if (doc.data().userHandle !== req.user.handle)
        return res.status(403).json({ error: "Unauthorized" });
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
