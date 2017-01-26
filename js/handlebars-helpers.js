Handlebars.registerHelper({
  uppercase: function (str) {
    return str.toUpperCase();
  },
  lowercase: function (str) {
    return str.toLowerCase();
  },
  currencyNumberNoCents: function (str) {
    return accounting.formatNumber(str);
  },
  currencyUSDNoCents: function (str) {
    return accounting.formatMoney(str, {precision: 0});
  },
  loanRate: function (str) {
    return str.toFixed(3)+'%';
  }
});
