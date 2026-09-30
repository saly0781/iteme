// Program content (fee, schedule, faculty, outcomes, etc.) now lives in the
// database — see src/hooks/usePrograms.js. This file only keeps content
// that isn't program-specific.

export const faq = [
  {
    question: 'Do I need my own equipment?',
    answer:
      'No. All core equipment — cameras, lighting, instruments, and studio gear — is provided during class sessions. A personal laptop is recommended for take-home editing work.',
  },
  {
    question: 'Can I apply for a scholarship?',
    answer:
      "Yes. Every program offers a scholarship track based on financial need — you'll choose this option during the enrollment step of your application.",
  },
  {
    question: 'Will I receive a certificate?',
    answer: 'Yes. All graduating students receive a shareable certificate of completion from Iteme Hub.',
  },
  {
    question: 'What happens if a session is full?',
    answer:
      "If your preferred session reaches capacity, you can still apply for the next intake — we'll notify you as soon as a seat opens up.",
  },
]

export const colorChoices = [
  '#2563EB', // blue
  '#DB2777', // pink
  '#059669', // emerald
  '#D97706', // amber
  '#7C3AED', // violet
  '#DC2626', // red
  '#0891B2', // cyan
  '#4B5563', // slate
]

export function formatRWF(amount) {
  return `${amount.toLocaleString('en-US')} RWF`
}

export function getTotals(program) {
  const sessions = Object.values(program.schedule)
  return {
    applied: sessions.reduce((sum, s) => sum + s.applied, 0),
    limit: sessions.reduce((sum, s) => sum + s.limit, 0),
  }
}
