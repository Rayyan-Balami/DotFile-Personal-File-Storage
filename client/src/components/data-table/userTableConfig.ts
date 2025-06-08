// Configuration for AdminUserTable filters and search columns

export const userFilterOptions = [
  {
    column: "role",
    label: "Role",
    options: [
      { label: "All", value: "" },
      { label: "Admin", value: "admin" },
      { label: "User", value: "user" },
    ],
  },
  {
    column: "deletedAt",
    label: "Status",
    options: [
      { label: "All", value: "" },
      { label: "Active", value: "active" },
      { label: "Deleted", value: "deleted" },
    ],
  },
];

export const userSearchColumns = [
  {
    column: "name",
    label: "Name",
  },
  {
    column: "email",
    label: "Email",
  },
];
