// Demo Day judging is over. Flip this to false to reopen the public form.
//
// Checked in two places: the /demo-day-judges page (so judges see a "closed"
// message instead of the form) and the POST /api/demo-day-judges handler (so a
// judge who still has the form open in a tab from the event can't submit a late
// or edited score). The API check is the one that actually protects the results.
export const DEMO_DAY_JUDGING_CLOSED = true;
