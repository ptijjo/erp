import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  contactInitials,
  displayName,
} from "../_lib/messaging-display";

type ContactAvatarProps = {
  contact: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    profilePhotoUrl?: string | null;
  };
  size?: "sm" | "default";
  className?: string;
};

export function ContactAvatar({
  contact,
  size = "default",
  className,
}: ContactAvatarProps) {
  const photo = contact.profilePhotoUrl?.trim();
  const name = displayName(contact);

  return (
    <Avatar size={size} className={className}>
      {photo ? (
        <AvatarImage src={photo} alt={`Photo de ${name}`} className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
        {contactInitials(contact)}
      </AvatarFallback>
    </Avatar>
  );
}
