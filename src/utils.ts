export const timeout = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms)
})

export const createSubject = (name: string) => {
  return `${name}.*`
}