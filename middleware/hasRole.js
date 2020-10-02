module.exports = function hasRole(roles) {
  return function (req, res, next) {
    if (!req.userData.role || !roles.includes(req.userData.role)) {
      return res.status(403).send('Access denied.');
    }

    next();
  };
};
