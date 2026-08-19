export const API = {
  auth: {
    login: "/auth/login",
  },
  users: {
    list: "/users",
    detail: (id: string) => `/users/${id}`,
    password: (id: string) => `/users/${id}/password`,
  },
}