export const saveUser = (token, user) => {
  if (token) localStorage.setItem('token', token)
  if (user) localStorage.setItem('user', JSON.stringify(user))
}

export const getUser = () => {
  try {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

export const getToken = () => localStorage.getItem('token')

export const clearUser = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const isLoggedIn = () => !!getToken()

export const isPro = () => {
  const user = getUser()
  return user?.plan === 'pro' || user?.plan === 'premium'
}

export const isPremium = () => {
  const user = getUser()
  return user?.plan === 'premium'
}

export const canAccessFeature = (requiredPlan) => {
  const user = getUser()
  if (!user) return false
  const hierarchy = { free: 0, pro: 1, premium: 2 }
  return hierarchy[user.plan] >= hierarchy[requiredPlan]
}
