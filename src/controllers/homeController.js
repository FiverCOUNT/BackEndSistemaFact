function index(req, res) {
  
  res.render('index', {
    title: 'BackEnd Easy',
    apiBase: '/api/items',
  });

}

module.exports = { index };
