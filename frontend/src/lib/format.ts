export function formatRelativeDay(iso: string) {
  const t = new Date(iso).getTime()
  const days = Math.floor((Date.now() - t) / 86400000)
  if (days <= 0) return "Today"
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function isOverdue(iso: string, status: string) {
  if (status === "Done") return false
  return new Date(iso) < new Date()
}
