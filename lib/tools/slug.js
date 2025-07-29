import slugify from 'slugify';

export function normalize(text) {
  return slugify(text || '', {
    replacement: '',
    lower: true,
    strict: true,
    locale: 'vi',
  });
}

export function includesOf(t1, t2) {
  return normalize(t1).includes(normalize(t2));
}
