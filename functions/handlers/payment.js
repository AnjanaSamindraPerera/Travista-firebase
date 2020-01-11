const functions = require("firebase-functions");
const stripe = require("stripe")("sk_test_VHReGSXrlL9BFyHuM7Cfutlr00YIc58GxK");
const uuid = require("uuid/v4");

// exports.checkout = functions.https.onRequest((request, res) => {
//   // Set your secret key: remember to change this to your live secret key in production
//   // See your keys here: https://dashboard.stripe.com/account/apikeys

//   // eslint-disable-next-line promise/catch-or-return

//   const customer = stripe.customers
//     .create({
//       email: request.body.token.email,
//       source: request.body.token.id
//     })
//     .then(id => (customer.id = id))
//     .catch(err => console.log(err));

//   const idempotency_key = uuid();
//   console.log(customer.id);

//   stripe.charges
//     .create(
//       {
//         amount: 0.99 * 100,
//         currency: "USD",
//         customer: customer.id,
//         receipt_email: request.body.token.email,
//         description: `Purchased the $0.99 advertisment`,
//         shipping: {
//           name: request.body.token.card.name,
//           address: {
//             line1: request.body.token.card.address_line1,
//             line2: request.body.token.card.address_line2,
//             city: request.body.token.card.address_city,
//             country: request.body.token.card.address_country,
//             postal_code: request.body.token.card.address_zip
//           }
//         }
//       },
//       {
//         idempotency_key
//       }
//     )
//     .then(charge => {
//       // asynchronously called

//       status = "success";
//       res.json({ status });
//       // response.send(charge);
//     })
//     .catch(err => {
//       console.log(err);
//     });
// });

exports.checkout = functions.https.onRequest(async (req, res) => {
  let error;
  let status;
  try {
    const { token } = req.body;

    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id
    });

    const idempotency_key = uuid();
    const charge = await stripe.charges.create(
      {
        amount: 0.99 * 100,
        currency: "usd",
        customer: customer.id,
        receipt_email: token.email,
        description: `Purchased the $0.99 advertisment`,
        shipping: {
          name: token.card.name,
          address: {
            line1: token.card.address_line1,
            line2: token.card.address_line2,
            city: token.card.address_city,
            country: token.card.address_country,
            postal_code: token.card.address_zip
          }
        }
      },
      {
        idempotency_key
      }
    );
    console.log("Charge:", { charge });
    status = "success";
  } catch (error) {
    console.error("Error:", error);
    status = "failure";
  }

  res.json({ error, status });
});
