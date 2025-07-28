export function parseSettings(rows) {
  const settingsObj = {
    meta: {},
    labels: {},
    labelsArabic: {}, // ✅ Add this
    arabic: {},
    prayers: {},
    themes: {},
    toggles: {},
    timings: {},
    messages: {},
    months: {},
  };

  rows.forEach((row) => {
    const groupRaw = row.Group?.trim();
    const group = groupRaw?.toLowerCase();
    const keyRaw = row.Key?.trim();
    const key = keyRaw?.toLowerCase();
    const value = row.Value?.trim();

    if (!group || !key || value === undefined) return;

    if (group === 'labels') {
      settingsObj.labels[key] = value;
    } else if (group === 'labels.arabic') {
      if (!settingsObj.prayers[key]) settingsObj.prayers[key] = {};
      settingsObj.prayers[key].ar = value;

      if (!settingsObj.arabic) settingsObj.arabic = {};
      settingsObj.arabic[key] = value;

      settingsObj.labelsArabic[key] = value; // ✅ Add this line
    } else if (group === 'jummahtimes') {
      if (!settingsObj.timings.jummahTimes) {
        settingsObj.timings.jummahTimes = {};
      }
      settingsObj.timings.jummahTimes[key] = value;
    } else {
      if (!settingsObj[group]) {
        settingsObj[group] = {};
      }
      settingsObj[group][key] = value;
    }
  });

  return settingsObj;
}
