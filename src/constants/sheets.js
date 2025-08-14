// src/constants/sheets.js
export const SHEET_ID = "1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g";

export const tab = (name) => `https://opensheet.elk.sh/${SHEET_ID}/${name}`;

export const lastUpdatedMeta = () =>
  `https://opensheet.elk.sh/${SHEET_ID}/settings?group=meta&key=lastUpdated`;
