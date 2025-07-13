export function parseSettings(rawSettingsArray) {
  const settingsObj = {
    prayers: {}, // we'll build this from labels and labels.arabic
  };

  for (const row of rawSettingsArray) {
    const group = row.Group?.trim();
    const key = row.Key?.trim();
    const value = row.Value?.trim();

    if (!group || !key) continue;

    if (group === 'labels') {
      if (!settingsObj.prayers[key]) settingsObj.prayers[key] = {};
      settingsObj.prayers[key].en = value;
    } else if (group === 'labels.arabic') {
      if (!settingsObj.prayers[key]) settingsObj.prayers[key] = {};
      settingsObj.prayers[key].ar = value;
    } else {
      // default: store other config as-is
      if (!settingsObj[group]) settingsObj[group] = {};
      settingsObj[group][key] = value;
    }
  }

  return settingsObj;
}
