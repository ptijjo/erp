import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { contactInitials } from "../_lib/messaging-display";

type ContactAvatarProps = {
  contact: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  size?: "sm" | "default";
  className?: string;
};

export function ContactAvatar({
  contact,
  size = "default",
  className,
}: ContactAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
        {contactInitials(contact)}
      </AvatarFallback>
    </Avatar>
  );
}
