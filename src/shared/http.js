/** Envolve handlers async para que erros caiam no middleware de erro. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Resposta padronizada de sucesso. */
export const ok = (res, data, status = 200) => res.status(status).json({ data });

/** Resposta paginada padronizada. */
export const paginated = (res, { items, total, page, limit }) =>
  res.json({
    data: items,
    meta: { total, page, limit, paginas: Math.max(1, Math.ceil(total / limit)) },
  });
