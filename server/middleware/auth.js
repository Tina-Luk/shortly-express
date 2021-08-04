const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  let createSession = function () {
    models.Sessions.create()
      .then((data) => {
        return models.Sessions.get({ id: data.insertId });
      })
      .then((sessionData) => {
        req.session = sessionData;
        res.cookie('shortlyid', sessionData.hash);
        next();
      })
      .catch((error) => {
        console.log('error', error);
      });
  };

  if (req.cookies.shortlyid) {
    models.Sessions.get({ hash: req.cookies.shortlyid }).then((sessionData) => {
      if (sessionData) {
        req.session = sessionData;
        next();
      } else {
        createSession();
      }
    });
  } else {
    createSession();
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

module.exports.verifySession = (req, res, next) => {
  if (req.body.username) {
    req.session.user = req.body.username;
  }
  if (models.Sessions.isLoggedIn(req.session)) {
    next();
  } else {
    res.redirect('/login');
  }
};
