export function parseSettings(rawSettingsArray) {
  const settingsObj = {
    prayers: {},
    labels: {},
  };

  for (const row of rawSettingsArray) {
    const group = row.Group?.trim();
    const key = row.Key?.trim();
    const value = row.Value?.trim();

    if (!group || !key) continue;

    if (group === 'labels') {
      if (!settingsObj.prayers[key]) settingsObj.prayers[key] = {};
      settingsObj.prayers[key].en = value;
      // ✅ Also store month overrides in settings.labels (e.g. safar: "Ṣafar")
      settingsObj.labels[key.toLowerCase()] = value;
    } else if (group === 'labels.arabic') {
      if (!settingsObj.prayers[key]) settingsObj.prayers[key] = {};
      settingsObj.prayers[key].ar = value;
    } else if (group === 'jummahTimes') {
      if (!settingsObj.timings) settingsObj.timings = {};
      if (!settingsObj.timings.jummahTimes) settingsObj.timings.jummahTimes = {};
      settingsObj.timings.jummahTimes[key] = value;
    } else {
      if (!settingsObj[group]) settingsObj[group] = {};
      try {
        settingsObj[group][key] = JSON.parse(value);
      } catch {
        settingsObj[group][key] = value;
      }
    }
  }

  console.log('✅ Parsed jummahTimes:', settingsObj.timings?.jummahTimes);
  console.log('✅ Hijri label overrides:', settingsObj.labels);
  return settingsObj;
}
