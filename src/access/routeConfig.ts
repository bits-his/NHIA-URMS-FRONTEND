export interface RouteConfig {
  path: string;
  label: string;
  module: string;         // Parent module title
  functionality: string;  // Child functionality title
}

export const ROUTE_CONFIG: RouteConfig[] = [
  { path: "/dashboard",                   label: "Dashboard",                 module: "Dashboard",         functionality: "Dashboard"                 },
  { path: "/finance/expenditure",         label: "Expenditure Payments",      module: "Finance",           functionality: "Expenditure Payments"      },
  { path: "/finance/payments",            label: "Payments",                  module: "Finance",           functionality: "Payments"                  },
  { path: "/finance/reporting",           label: "Reporting",                 module: "Finance",           functionality: "Reporting"                 },
  { path: "/finance/financial-reporting", label: "Financial Reporting",       module: "Finance",           functionality: "Financial Reporting"       },
  { path: "/finance/facilities",          label: "Facilities",                module: "Finance",           functionality: "Facilities"                },
  { path: "/finance/hr-support",          label: "HR Support",                module: "Finance",           functionality: "HR Support"                },
  { path: "/standards/qa-officers",       label: "QA Officers",               module: "Standards",         functionality: "QA Officers"               },
  { path: "/standards/complaints",        label: "Enrollee Complaints",       module: "Standards",         functionality: "Enrollee Complaints"       },
  { path: "/ict/support-desk",            label: "ICT Support Desk",          module: "ICT",               functionality: "ICT Support Desk"          },
  { path: "/ict/systems",                 label: "Systems & Network",         module: "ICT",               functionality: "Systems & Network"         },
  { path: "/programmes/activities",       label: "Programme Activities",      module: "Programmes",        functionality: "Programme Activities"      },
  { path: "/sdo/coordination",            label: "State Office Coordination", module: "SDO",               functionality: "State Office Coordination" },
  { path: "/sdo/stock",                   label: "Stock Verification",        module: "SDO",               functionality: "Stock Verification"        },
  { path: "/zonal/monitoring-visits",       label: "Monitoring Visits",             module: "Zonal", functionality: "Monitoring Visits"             },
  { path: "/sdo/servicom",                label: "SERVICOM Dashboard",        module: "SDO",               functionality: "SERVICOM Dashboard"        },
  { path: "/sdo/servicom/complaints",     label: "Complaints Management",         module: "SDO", functionality: "Complaints Management"         },
  { path: "/sdo/servicom/satisfaction",   label: "HCF Customer Satisfaction",  module: "SDO", functionality: "HCF Customer Satisfaction"  },
  { path: "/sdo/servicom/comment-card",   label: "Charter Performance",           module: "SDO", functionality: "Charter Performance"           },
  { path: "/sdo/projects",                label: "SPECIAL PROJECT",           module: "SDO",               functionality: "SPECIAL PROJECT"           },
  { path: "/notifications",               label: "Notifications",             module: "Notifications",     functionality: "Notifications"             },
  { path: "/settings/users",              label: "Users",                     module: "Settings",          functionality: "Users"                     },
  { path: "/settings/privileges",         label: "Privileges",                module: "Settings",          functionality: "Privileges"                },
];
