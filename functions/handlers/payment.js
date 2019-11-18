const functions = require("firebase-functions");
const stripe = require("stripe")("sk_test_VHReGSXrlL9BFyHuM7Cfutlr00YIc58GxK");

exports.checkout = functions.https.onRequest((request, response) => {
  // Set your secret key: remember to change this to your live secret key in production
  // See your keys here: https://dashboard.stripe.com/account/apikeys

  // eslint-disable-next-line promise/catch-or-return
  stripe.charges
    .create({
      amount: request.body.amount,
      currency: request.body.currency,
      source: request.body.token
    })
    .then(charge => {
      // asynchronously called
      response.send(charge);
    })
    .catch(err => {
      console.log(err);
    });
});
