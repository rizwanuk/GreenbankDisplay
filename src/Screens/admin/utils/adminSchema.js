// src/Screens/admin/utils/adminSchema.js

import LabelsPanel from "../panels/LabelsPanel";
import MosquePanel from "../panels/MosquePanel";
import PrayerTimesPanel from "../panels/PrayerTimesPanel";
import PrayerRulesPanel from "../panels/PrayerRulesPanel";
import JummahTimesPanel from "../panels/JummahTimesPanel";
import IslamicCalendarPanel from "../panels/IslamicCalendarPanel";
import ThemePanel from "../panels/ThemePanel";
import TestModePanel from "../panels/TestModePanel";

// ⬇️ NEW (panel will be created next)
import SlideshowPanel from "../panels/SlideshowPanel";

/**
 * Admin schema
 * Controls which setting groups are editable in Admin
 */
export const ADMIN_SCHEMA = [
  {
    id: "labels",
    title: "Labels",
    panel: LabelsPanel,
  },
  {
    id: "mosque",
    title: "Mosque",
    panel: MosquePanel,
  },
  {
    id: "prayerTimes",
    title: "Prayer Times",
    panel: PrayerTimesPanel,
  },
  {
    id: "prayerRules",
    title: "Prayer Rules",
    panel: PrayerRulesPanel,
  },
  {
    id: "jummahTimes",
    title: "Jummah Times",
    panel: JummahTimesPanel,
  },
  {
    id: "islamicCalendar",
    title: "Islamic Calendar",
    panel: IslamicCalendarPanel,
  },
  {
    id: "theme",
    title: "Theme",
    panel: ThemePanel,
  },

  // ✅ NEW: Slideshow settings
  {
    id: "slideshow",
    title: "Slideshow",
    panel: SlideshowPanel,
  },

  {
    id: "testMode",
    title: "Test Mode",
    panel: TestModePanel,
  },
];

export default ADMIN_SCHEMA;
