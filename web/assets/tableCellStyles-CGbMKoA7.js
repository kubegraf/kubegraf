function getTableCellStyle(fontSize, textColor = "#0ea5e9") {
  return {
    padding: "0 8px",
    "text-align": "left",
    color: textColor,
    "font-weight": "900",
    "font-size": `${fontSize}px`,
    height: `${Math.max(24, fontSize * 1.7)}px`,
    "line-height": `${Math.max(24, fontSize * 1.7)}px`,
    border: "none"
  };
}
function getTableHeaderCellStyle(fontSize) {
  return {
    padding: "0 8px",
    "text-align": "left",
    "font-weight": "900",
    color: "#0ea5e9",
    "font-size": `${fontSize}px`,
    border: "none"
  };
}
function getTableHeaderRowStyle(fontSize) {
  return {
    height: `${Math.max(24, fontSize * 1.7)}px`,
    "line-height": `${Math.max(24, fontSize * 1.7)}px`
  };
}
const STANDARD_TEXT_COLOR = "#0ea5e9";

export { STANDARD_TEXT_COLOR as S, getTableHeaderRowStyle as a, getTableHeaderCellStyle as b, getTableCellStyle as g };
//# sourceMappingURL=tableCellStyles-CGbMKoA7.js.map
