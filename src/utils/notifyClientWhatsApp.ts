import { shareToWhatsApp } from "./shareToWhatsApp";

interface NotifiableProject {
  project_type: string;
  customer_name?: string | null;
}

// Staff-triggered "Notify Client (WhatsApp)" action - builds the message
// and opens wa.me exactly like every other WhatsApp share in this app
// (see shareToWhatsApp.ts), addressless like the rest (staff picks the
// recipient in WhatsApp itself) rather than a phone number, since
// ProjectRead carries no contact_number today. Recording that a notify
// happened (PATCH /projects/{id}/notify) is the caller's job - see
// useProjectStore's notifyClient - kept separate from this pure
// message-building/opening step, same split shareToWhatsApp itself uses.
export function notifyClientWhatsApp(project: NotifiableProject) {
  const name = project.customer_name ? project.customer_name.split(" ")[0] : "there";
  const portalUrl = `${window.location.origin}/portal/login`;
  const text = `Hi ${name}, your order "${project.project_type}" is ready! Log in to the client portal to view your order and billing: ${portalUrl}`;

  shareToWhatsApp(text);
}
