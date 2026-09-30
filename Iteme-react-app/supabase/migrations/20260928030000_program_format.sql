-- Sets the "format" stat shown on the program detail page. Every program now
-- offers both in-person shifts and an online session, so "Hybrid" reflects
-- that better than the old single-campus "In-studio · Kigali Campus" copy.
update programs set format = 'Hybrid · In-studio & Online'
where id in (
  'audio-production', 'video-production', 'film-acting-directing', 'graphic-design',
  'photography', 'dj-course', 'software-development', 'ict'
);
