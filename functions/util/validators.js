const isEmpty = string => {
  //check firld is empty
  if (string.trim() === "") return true;
  else return false;
};

const isEmail = email => {
  //check whether it's a email
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (email.match(regEx)) return true;
  else return false;
};

exports.validateSignupData = data => {
  //validate data
  let errors = {};

  //correct email errors
  if (isEmpty(data.email)) {
    errors.email = " Must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Must be a valid email address";
  }

  //corect password errors

  if (isEmpty(data.password)) errors.password = "Must not be empty";

  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Passwords must be matched";

  //corect name errors
  if (isEmpty(data.handle)) errors.handle = "Must not be empty";

  //also need category done
  if (data.category.length == 0)
    errors.general = "category should be selected ";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.validateLoginData = data => {
  let errors = {};

  if (isEmpty(data.email)) errors.email = "must not be empty";

  if (isEmpty(data.password)) errors.password = "must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.validateForgetPassword = data => {
  let errors = {};

  //correct email errors
  if (isEmpty(data.email)) {
    errors.email = " Must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Must be a valid email address";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.validateChangePassword = data => {
  //validate data
  let errors = {};

  //corect password errors

  if (isEmpty(data.password)) errors.password = "Must not be empty";
  if (isEmpty(data.newPassword)) errors.password = "Must not be empty";

  if (data.newPassword !== data.confirmPassword)
    errors.confirmPassword = "Passwords must be matched";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.validateChangeEmail = data => {
  let errors = {};

  //corect password errors

  if (isEmpty(data.password)) errors.password = "Must not be empty";

  //correct email errors
  if (isEmpty(data.email)) {
    errors.email = " Must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Must be a valid email address";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.reduceUserDetails = data => {
  //by doing so if each user have this property and we make sure not to send empty string if they not poses that property

  let userDetails = {};

  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  else userDetails.bio = " ";

  if (!isEmpty(data.lat)) userDetails.lat = data.lat;
  else userDetails.lat = " ";

  if (!isEmpty(data.long)) userDetails.long = data.long;
  else userDetails.long = " ";

  if (!isEmpty(data.website.trim())) {
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else {
      userDetails.website = data.website;
    }
  } else userDetails.website = " ";

  if (!isEmpty(data.location.trim())) userDetails.location = data.location;
  else userDetails.location = " ";

  if (!isEmpty(data.telNo.trim())) userDetails.telNo = data.telNo;
  else userDetails.telNo = " ";

  if (!isEmpty(data.booking.trim())) {
    if (data.booking.trim().substring(0, 4) !== "http") {
      userDetails.booking = `http://${data.booking.trim()}`;
    } else {
      userDetails.booking = data.booking;
    }
  } else userDetails.booking = " ";

  //need to add properties category wise too
  return userDetails;
};
