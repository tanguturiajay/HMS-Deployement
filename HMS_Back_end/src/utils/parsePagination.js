const parsePagination = (query, defaultLimit = 10) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1),
    100,
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

module.exports = parsePagination;