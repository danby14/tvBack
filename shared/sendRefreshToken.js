const sendRefreshToken = (res, token) => {
  res.cookie('tvrt', token, {
    expires: new Date(Date.now() + 168 * 3600000), // cookie will be removed after 7 days
    httpOnly: true,
    path: '/refresh_token',
    sameSite: 'lax',
    // sameSite: 'none',
    // secure: true,
  });
};

exports.sendRefreshToken = sendRefreshToken;
