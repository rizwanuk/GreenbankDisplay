// src/constants/sheets.js
export const SHEET_ID = "1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g";

export const tab = (name) => `https://opensheet.elk.sh/${SHEET_ID}/${name}`;

// OpenSheet does NOT support query filtering.
// Return the full settings tab URL and filter in code.
export const lastUpdatedMeta = () => tab("settings");
