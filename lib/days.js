/**
 * Each day is represented by a bit flag, with Sunday in the least significant position (1) and
 * Saturday in the greatest (64). Multi-day flags are created using bitwise OR.
 */
// Day flags
const SUN = 1 << 0
const MON = 1 << 1
const TUE = 1 << 2
const WED = 1 << 3
const THU = 1 << 4
const FRI = 1 << 5
const SAT = 1 << 6
// Multi-day flags
const MWF = MON | WED | FRI
const TTH = TUE | THU
const WEEKENDS = SAT | SUN
const WEEKDAYS = MWF | TTH
const DAILY = WEEKDAYS | WEEKENDS
const ALL = DAILY
const DAYS = [SUN, MON, TUE, WED, THU, FRI, SAT, DAILY, MWF, TTH, WEEKDAYS, WEEKENDS]
// Flag to get every page, regardless of days set
const ANY = 0

// Day names (used as part of i18n keys)
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  'Daily', 'MWF', 'TTh', 'Weekdays', 'Weekends']
