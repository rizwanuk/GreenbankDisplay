export function parseSettings(rawSettingsArray) {
  const settingsObj = {
    prayers: {}, // we'll build this from labels and labels.arabic
  };

  const jummahTimes = {};

  for (const row of rawSettingsArray) {
    const group = row.Group?.trim();
    const key = row.Key?.trim();
    const subkey = row.Subkey?.trim();
    const value = row.Value?.trim();

    if (!group || !key) continue;

    if (group === 'labels') {
      if (!settingsObj.prayers[key]) settingsObj.prayers[key] = {};
      settingsObj.prayers[key].en = value;
    } else if (group === 'labels.arabic') {
      if (!settingsObj.prayers[key]) settingsObj.prayers[key] = {};
      settingsObj.prayers[key].ar = value;
    } else if (group === 'timings' && key === 'jummahTimes' && subkey) {
      // ✅ Special handling for jummahTimes with seasonal subkeys
      jummahTimes[subkey] = value;
    } else {
      if (!settingsObj[group]) settingsObj[group] = {};
      try {
        settingsObj[group][key] = JSON.parse(value);
      } catch {
        settingsObj[group][key] = value;
      }
    }
  }

  // Inject jummahTimes if any were found
  if (Object.keys(jummahTimes).length > 0) {
    if (!settingsObj.timings) settingsObj.timings = {};
    settingsObj.timings.jummahTimes = jummahTimes;
    console.log('✅ Parsed jummahTimes:', jummahTimes);
  }

  return settingsObj;
}
