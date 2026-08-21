export const API = {
  auth: {
    login: "/auth/login",
    me: "/auth/me",

  },
  users: {
    list: "/users",
    detail: (id: string) => `/users/${id}`,
    password: (id: string) => `/users/${id}/password`,
  },
}