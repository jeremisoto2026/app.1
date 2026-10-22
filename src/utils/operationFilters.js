const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase();

export const filterOperations = (operations = [], filters = {}) => {
  const safeOperations = Array.isArray(operations) ? operations : [];
  const crypto = normalize(filters.crypto);
  const fiat = normalize(filters.fiat);
  const exchange = normalize(filters.exchange);
  const search = normalize(filters.search);

  return safeOperations.filter((operation) => {
    if (crypto && normalize(operation.crypto) !== crypto) return false;
    if (fiat && normalize(operation.fiat) !== fiat) return false;
    if (exchange && normalize(operation.exchange) !== exchange) return false;

    if (search) {
      const searchableFields = [
        operation.order_id,
        operation.crypto,
        operation.fiat,
        operation.exchange,
      ];
      const matchesSearch = searchableFields.some((field) => normalize(field).includes(search));
      if (!matchesSearch) return false;
    }

    return true;
  });
};
