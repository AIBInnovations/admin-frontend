/**
 * Set while the Explorer follows a folder that was just moved to its new
 * address. The old address briefly no longer holds it; this stops the page
 * from saying "no longer here" and jumping up a level meanwhile.
 */
export const following: { url: string | null } = { url: null }
