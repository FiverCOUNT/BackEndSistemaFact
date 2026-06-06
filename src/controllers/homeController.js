function index(req, res) {
  res.render('index', {
    title: 'BackEnd Easy',
    apiBase: '/api',
  });
}

module.exports = { index };
