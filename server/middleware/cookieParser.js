const parseCookies = (req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    var arr = req.headers.cookie.split('; ');
    arr.forEach(item => {
      var newCookie = item.split('=');
      req.cookies[newCookie[0]] = newCookie[1];
    });
  }
  next();
};

module.exports = parseCookies;