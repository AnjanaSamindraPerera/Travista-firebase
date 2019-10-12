const { db, admin } = require("../util/admin");

exports.getAllReviews = (req, res) => {
  db.collection("reviews")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let reviews = []; //to store review collection docs
      data.forEach(doc => {
        reviews.push({
          reviewId: doc.id,
          body: doc.data().body,
          travelerId: doc.data().travelerId,
          createdAt: doc.data().createdAt,
          serviceId: doc.data().serviceId
        }); //doc is a refference.to access data we use that function
      });

      return res.json(reviews);
    })
    .catch(err => console.error());
};

exports.postOneReview = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }

  const newReview = {
    body: req.body.body,
    travelerId: req.params.travelerId,
    createdAt: new Date().toISOString(),
    serviceId: req.params.serviceId
  };

  admin
    .firestore()
    .collection("reviews")
    .add(newReview) //get json object ->add
    .then(doc => {
      res.json({ message: `document ${doc.id} created succesfully` });
    })
    .catch(err => {
      res.status(500).json({ error: "something wrong" }); //500 status code because server error
      console.log(err);
    });
};
