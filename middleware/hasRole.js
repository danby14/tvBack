module.exports = function hasRole(roles) {
  return function (req, res, next) {
    console.log('1');
    if (!req.userData.role || !roles.includes(req.userData.role)) {
      return res.status(403).send('Access denied.');
    }
    console.log('2');

    next();
  };
};
