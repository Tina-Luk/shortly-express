const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const cookieParser = require('./middleware/cookieParser');
const Auth = require('./middleware/auth');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser);
app.use(Auth.createSession);

app.get('/', Auth.verifySession, (req, res) => {
  res.render('index');
});

app.get('/create', Auth.verifySession, (req, res) => {
  res.render('index');
});

app.get('/login',
  (req, res) => {
    res.render('login');
  });

app.get('/signup',
  (req, res) => {
    res.render('signup');
  });


app.get('/links', Auth.verifySession, (req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
});

app.post('/links', (req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.post('/signup', (req, res, next) => {
  let username = req.body.username;
  models.Users.get({ username })
    .then((data) => {
      if (data) {
        res.redirect('/signup');
      } else {
        models.Users.create(req.body)
          .then((data) => {
            return models.Sessions.update({ 'hash': req.session.hash }, {'userId': data.insertId});
          })
          .then((data) => {
            res.redirect('/');
          });
      }
    }).catch(error => {
      console.log('error', error);
    });
});

app.post('/login', (req, res, next) => {
  let username = req.body.username;
  let password = req.body.password;
  models.Users.get({ username })
    .then((data) => {
      if (data) {
        let passwordCorrect = models.Users.compare(password, data.password, data.salt);
        if (passwordCorrect) {
          models.Sessions.update({ 'hash': req.session.hash }, {'userId': data.insertId})
            .then(() => {
              res.redirect('/');
            });
        } else {
          res.redirect('/login');
        }
      } else {
        res.redirect('/login');
      }
    })
    .catch(error => {
      console.log('error', error);
    });
});

app.get('/logout', (req, res, next) => {
  models.Sessions.delete({hash: req.session.hash})
    .then(data => {
      res.cookie('shortlyid', null);
      res.redirect('/');
    });
});

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {
  return models.Links.get({ code: req.params.code })
    .tap(link => {
      if (link) {
        return models.Clicks.create({ linkId: link.id });
      } else {
        throw new Error('Link does not exist');
      }
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
