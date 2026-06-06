const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function parseListQuery(query) {
  const q = (query.q || '').trim();
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limitRaw = parseInt(query.limit, 10);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(10, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_PAGE_SIZE)
  );
  return { q, page, pageSize, skip: (page - 1) * pageSize };
}

function buildPageMeta({ total, page, pageSize, basePath, query = {} }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const buildUrl = (targetPage) => {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.kind) params.set('kind', query.kind);
    if (query.company) params.set('company', query.company);
    if (query.msg) params.set('msg', query.msg);
    if (query.tipo) params.set('tipo', query.tipo);
    if (targetPage > 1) params.set('page', String(targetPage));
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('limit', String(pageSize));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    from,
    to,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
    prevUrl: buildUrl(safePage - 1),
    nextUrl: buildUrl(safePage + 1),
    firstUrl: buildUrl(1),
    lastUrl: buildUrl(totalPages),
  };
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parseListQuery,
  buildPageMeta,
};
