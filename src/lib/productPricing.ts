export const formatProductPrice = (
  priceKzt?: number | null,
  priceUsd?: number | null
) => {
  if (typeof priceKzt === "number" && Number.isFinite(priceKzt)) {
    return `${priceKzt.toLocaleString("ru-RU")} ₸`;
  }

  if (typeof priceUsd === "number" && Number.isFinite(priceUsd)) {
    return `$${priceUsd.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  return "Цена не указана";
};

export const getProductPriceInputValue = (price?: number | null) => {
  return typeof price === "number" && Number.isFinite(price) ? String(price) : "";
};

export const getProductPriceKztValue = (priceKzt?: number | null) => {
  return typeof priceKzt === "number" && Number.isFinite(priceKzt) ? priceKzt : 0;
};
