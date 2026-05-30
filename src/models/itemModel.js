const Item = require('./Item');

async function findAll() {
  const rows = await Item.findAll({ order: [['id', 'ASC']] });
  return rows.map(toPlain);
}

async function findById(id) {
  const row = await Item.findByPk(id);
  return row ? toPlain(row) : null;
}

async function create(data) {
  const row = await Item.create({
    name: data.name,
    description: data.description || '',
    price: Number(data.price) || 0,
  });
  return toPlain(row);
}

async function update(id, data) {
  const row = await Item.findByPk(id);
  if (!row) return null;

  await row.update({
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.price !== undefined && { price: Number(data.price) }),
  });

  return toPlain(row);
}

async function remove(id) {
  const deleted = await Item.destroy({ where: { id } });
  return deleted > 0;
}

function toPlain(row) {
  const json = row.toJSON();
  return {
    ...json,
    price: Number(json.price),
  };
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
