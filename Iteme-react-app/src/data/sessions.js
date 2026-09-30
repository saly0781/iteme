export const SESSION_TYPES = [
  { id: 'morning', label: 'Morning', icon: 'fa-sun' },
  { id: 'afternoon', label: 'Afternoon', icon: 'fa-cloud-sun' },
  { id: 'evening', label: 'Evening', icon: 'fa-moon' },
  { id: 'weekend', label: 'Weekend', icon: 'fa-calendar-week' },
  { id: 'online', label: 'Online', icon: 'fa-laptop' },
]

export function sessionLabel(id) {
  return SESSION_TYPES.find((s) => s.id === id)?.label || id
}

export function sessionIcon(id) {
  return SESSION_TYPES.find((s) => s.id === id)?.icon || 'fa-clock'
}
