-- Practice game for development and the team dry run.
-- Deliberately generic, non-Figma prompts: this file is in a public repo,
-- so it must never contain the real Midyear content.

insert into public.games (slug, title, opens_at, closes_at)
values ('practice', 'Figillion practice dive', now() - interval '1 day', now() + interval '365 days')
on conflict (slug) do nothing;

insert into public.import_prompts (game_slug, round, theme, prompt) values
  ('practice', 1, 'Warm up',     'Name a color'),
  ('practice', 2, 'Snack break', 'Name a fruit'),
  ('practice', 3, 'Space',       'Name a planet in our solar system'),
  ('practice', 4, 'Dev corner',  'Name a programming language'),
  ('practice', 5, 'Online',      'Name a social media app');

insert into public.import_answers (game_slug, round, answer, aliases, tier, fun_fact) values
  ('practice', 1, 'Red',        null,              'common',     null),
  ('practice', 1, 'Blue',       null,              'common',     null),
  ('practice', 1, 'Green',      null,              'common',     null),
  ('practice', 1, 'Yellow',     null,              'common',     null),
  ('practice', 1, 'Teal',       null,              'overplayed', null),
  ('practice', 1, 'Magenta',    null,              'uncommon',   null),
  ('practice', 1, 'Cerulean',   null,              'rare',       null),
  ('practice', 1, 'Chartreuse', null,              'rare',       null),
  ('practice', 1, 'Vermilion',  'vermillion',      'deep_cut',   null),
  ('practice', 1, 'Periwinkle', null,              'deep_cut',   null),
  ('practice', 1, 'Falu red',   'falun red',       'figlion',    'A deep red paint made from copper mine waste in Falun, Sweden.'),

  ('practice', 2, 'Apple',       null,             'common',     null),
  ('practice', 2, 'Banana',      null,             'common',     null),
  ('practice', 2, 'Orange',      null,             'common',     null),
  ('practice', 2, 'Dragon fruit','dragonfruit|pitaya', 'overplayed', null),
  ('practice', 2, 'Durian',      null,             'overplayed', null),
  ('practice', 2, 'Kiwi',        'kiwifruit',      'uncommon',   null),
  ('practice', 2, 'Lychee',      'litchi',         'rare',       null),
  ('practice', 2, 'Rambutan',    null,             'rare',       null),
  ('practice', 2, 'Salak',       'snake fruit',    'deep_cut',   null),
  ('practice', 2, 'Cherimoya',   null,             'deep_cut',   null),
  ('practice', 2, 'Jabuticaba',  null,             'figlion',    'It grows directly on the trunk of the tree.'),

  ('practice', 3, 'Earth',   null, 'common',   null),
  ('practice', 3, 'Mars',    null, 'common',   null),
  ('practice', 3, 'Jupiter', null, 'common',   null),
  ('practice', 3, 'Saturn',  null, 'common',   null),
  ('practice', 3, 'Venus',   null, 'uncommon', null),
  ('practice', 3, 'Uranus',  null, 'rare',     null),
  ('practice', 3, 'Mercury', null, 'rare',     null),
  ('practice', 3, 'Neptune', null, 'figlion',  'It was found by math before anyone saw it, in 1846.'),

  ('practice', 4, 'Python',     null,         'common',     null),
  ('practice', 4, 'JavaScript', 'js',         'common',     null),
  ('practice', 4, 'Java',       null,         'common',     null),
  ('practice', 4, 'TypeScript', 'ts',         'overplayed', null),
  ('practice', 4, 'COBOL',      null,         'overplayed', null),
  ('practice', 4, 'Rust',       null,         'uncommon',   null),
  ('practice', 4, 'Go',         'golang',     'uncommon',   null),
  ('practice', 4, 'Haskell',    null,         'rare',       null),
  ('practice', 4, 'Elixir',     null,         'rare',       null),
  ('practice', 4, 'Fortran',    null,         'deep_cut',   null),
  ('practice', 4, 'Befunge',    null,         'figlion',    'Its code runs in two dimensions across a grid.'),

  ('practice', 5, 'Instagram',  'insta|ig',   'common',     null),
  ('practice', 5, 'TikTok',     null,         'common',     null),
  ('practice', 5, 'X',          'twitter',    'common',     null),
  ('practice', 5, 'Snapchat',   'snap',       'common',     null),
  ('practice', 5, 'Tumblr',     null,         'overplayed', null),
  ('practice', 5, 'Bluesky',    null,         'uncommon',   null),
  ('practice', 5, 'Threads',    null,         'uncommon',   null),
  ('practice', 5, 'Mastodon',   null,         'rare',       null),
  ('practice', 5, 'BeReal',     null,         'rare',       null),
  ('practice', 5, 'Vine',       null,         'deep_cut',   null),
  ('practice', 5, 'Friendster', null,         'figlion',    'It launched in 2002, a year before MySpace.');

select private.publish_import('practice', true);
